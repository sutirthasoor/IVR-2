import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FbUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { store } from "./mock-store";
import type { AppUser, Role } from "./types";

interface AuthContextValue {
  user: AppUser | null;
  fbUser: FbUser | null;
  loading: boolean;
  isDemo: boolean;
  loginDemo: (userId: string) => void;
  loginEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_KEY = "crm-demo-user-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Try to restore demo session immediately
    if (typeof window !== "undefined") {
      const demoId = localStorage.getItem(DEMO_KEY);
      if (demoId) {
        const u = store.getUser(demoId);
        if (u) {
          setUser(u);
          setIsDemo(true);
          setLoading(false);
          return;
        }
      }
    }

    const unsub = onAuthStateChanged(auth, (fb) => {
      setFbUser(fb);
      if (fb) {
        let appUser = store.getUser(fb.uid);
        if (!appUser) {
          appUser = {
            id: fb.uid,
            fullName: fb.displayName || fb.email || "User",
            email: fb.email || "",
            role: "super_admin",
            status: "active",
            createdAt: Date.now(),
            lastLogin: Date.now(),
          };
          store.upsertUser(appUser);
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      fbUser,
      loading,
      isDemo,
      loginDemo: (id) => {
        const u = store.getUser(id);
        if (!u) return;
        localStorage.setItem(DEMO_KEY, id);
        setUser(u);
        setIsDemo(true);
        store.log(u.id, u.fullName, "Logged in (demo)");
      },
      loginEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (isDemo) {
          localStorage.removeItem(DEMO_KEY);
          setUser(null);
          setIsDemo(false);
          return;
        }
        await signOut(auth);
      },
      hasRole: (...roles) => !!user && roles.includes(user.role),
    }),
    [user, fbUser, loading, isDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

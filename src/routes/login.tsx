import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, login, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("Auth loading state:", authLoading);
    console.log("User state:", user);
  }, [authLoading, user]);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    console.log("Attempting login with:", email);
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully!");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.message ?? "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  // Enable button if not busy, regardless of authLoading
  const isDisabled = busy; // Remove authLoading from here temporarily

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="grid w-full max-w-md gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to Call CRM</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use your Firebase credentials to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={busy}
                />
              </div>
              <Button type="submit" disabled={isDisabled} className="w-full">
                {busy ? "Signing in…" : authLoading ? "Loading..." : "Sign in"}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p className="text-xs">
                Status: {authLoading ? "Loading Firebase..." : "Firebase Ready"}
              </p>
              <p className="mt-2">Demo credentials (create in Firebase first):</p>
              <p className="mt-1 text-xs">
                admin@luxe.com / password123<br />
                agent@luxe.com / password123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
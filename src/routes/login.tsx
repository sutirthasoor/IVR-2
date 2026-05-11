import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { store } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: () => (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { user, loginEmail, loginDemo } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginEmail(email, password);
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const demoUsers = store.listUsers().filter((u) =>
    ["super_admin", "admin", "manager", "agent"].includes(u.role),
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to Luxe CRM</CardTitle>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Or explore in demo mode</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick a role to instantly preview the portal with sample data.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoUsers.map((u) => (
              <Button
                key={u.id}
                variant="outline"
                className="w-full justify-between"
                onClick={() => {
                  loginDemo(u.id);
                  nav({ to: "/dashboard" });
                }}
              >
                <span className="text-left">
                  <span className="block text-sm font-medium">{u.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">
                  {u.role.replace("_", " ")}
                </span>
              </Button>
            ))}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

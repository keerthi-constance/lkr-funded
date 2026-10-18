import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/backend/auth-functions";
import type { Role } from "@/backend/server/auth";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — FundEd" }] }),
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});

const dashboardByRole: Record<Role, string> = {
  student: "/dashboard/student",
  university: "/dashboard/university",
  admin: "/dashboard/admin",
  donor: "/dashboard/donor",
};

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login({ data: { username, password } });
      if (redirect) {
        window.location.href = redirect;
      } else {
        navigate({ to: dashboardByRole[user.role] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-14 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your FundEd account.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Username
                </label>
                <Input
                  className="mt-1.5"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, donr1, student1, uoc"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <Input
                  className="mt-1.5"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={busy} className="w-full bg-teal-gradient text-navy-deep">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here? <Link to="/auth/register" className="font-semibold text-teal hover:underline">Create an account</Link>
            </p>
          </div>
        </motion.div>
      </main>
      <SiteFooter />
    </>
  );
}

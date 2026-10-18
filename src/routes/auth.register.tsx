import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUniversities } from "@/backend/functions";
import { register } from "@/backend/auth-functions";
import type { Role } from "@/backend/server/auth";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Create Account — FundEd" }] }),
  loader: async () => ({ universities: await getUniversities() }),
  component: RegisterPage,
});

const dashboardByRole: Record<Role, string> = {
  student: "/dashboard/student",
  university: "/dashboard/university",
  admin: "/dashboard/admin",
  donor: "/dashboard/donor",
};

const signUpRoles: { value: "donor" | "student" | "university"; label: string }[] = [
  { value: "donor", label: "Donor" },
  { value: "student", label: "Student" },
  { value: "university", label: "University" },
];

function RegisterPage() {
  const { universities } = Route.useLoaderData();
  const navigate = useNavigate();

  const [role, setRole] = useState<"donor" | "student" | "university">("donor");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [universityShort, setUniversityShort] = useState(universities[0]?.short ?? "");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsBankDetails = role === "donor" || role === "student";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await register({
        data: {
          username,
          password,
          displayName,
          role,
          universityShort: role === "university" ? universityShort : undefined,
          bankDetails: needsBankDetails
            ? { accountName, bankName, accountNumber, branch }
            : undefined,
        },
      });
      navigate({ to: dashboardByRole[user.role] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join FundEd as a donor, student, or university.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                I am a
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {signUpRoles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      role === r.value
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-teal/40"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {role === "university" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  University
                </label>
                <select
                  value={universityShort}
                  onChange={(e) => setUniversityShort(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-teal"
                >
                  {universities.map((u) => (
                    <option key={u.short} value={u.short}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              placeholder={role === "university" ? "Contact person name" : "Full name"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {needsBankDetails && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bank details
                </p>
                <p className="text-xs text-muted-foreground">
                  Where {role === "student" ? "milestone disbursements" : "auction reward payouts"}{" "}
                  are sent. Test data is fine for now.
                </p>
                <Input
                  placeholder="Account holder name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Bank name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                  />
                </div>
                <Input
                  placeholder="Account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>
            )}

            <Button type="submit" disabled={busy} className="w-full bg-teal-gradient text-navy-deep">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered? <Link to="/auth/login" className="font-semibold text-teal hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

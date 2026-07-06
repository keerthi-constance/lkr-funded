import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GraduationCap, Building2, ShieldCheck, Heart } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — FundEd" }] }),
  component: LoginPage,
});

const roles = [
  { key: "student", label: "Student", to: "/dashboard/student", icon: GraduationCap },
  { key: "university", label: "University", to: "/dashboard/university", icon: Building2 },
  { key: "admin", label: "Admin", to: "/dashboard/admin", icon: ShieldCheck },
  { key: "donor", label: "Donor", to: "/dashboard/donor", icon: Heart },
];

function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-14 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your FundEd account.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <Input className="mt-1.5" type="email" placeholder="you@university.lk" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <Input className="mt-1.5" type="password" placeholder="••••••••" />
              </div>
              <Button className="w-full bg-teal-gradient text-navy-deep">Sign in</Button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or continue as</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <Link key={r.key} to={r.to} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 transition hover:border-teal hover:bg-teal/5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal/15 text-teal">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">{r.label} Demo</span>
                </Link>
              ))}
            </div>

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

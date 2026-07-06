import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Create Account — FundEd" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join FundEd as a student or donor.</p>
          <div className="mt-6 space-y-4">
            <Input placeholder="Full name" />
            <Input placeholder="Email" type="email" />
            <Input placeholder="Password" type="password" />
            <Button className="w-full bg-teal-gradient text-navy-deep">Create account</Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered? <Link to="/auth/login" className="font-semibold text-teal hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

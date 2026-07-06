import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Menu, X, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/browse", label: "Explore" },
  { to: "/how-it-works", label: "How it Works" },
  { to: "/transparency", label: "Transparency" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDash = pathname.startsWith("/dashboard");
  if (onDash) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-gradient shadow-glow-teal">
            <span className="font-display text-lg font-bold text-navy-deep">F</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Fund<span className="text-teal-gradient">Ed</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <Search className="h-4 w-4" />
          </button>
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm" className="bg-teal-gradient text-navy-deep hover:opacity-90 shadow-glow-teal">
              <Wallet className="mr-1.5 h-4 w-4" /> Get Started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/40 md:hidden">
          <div className="mx-auto max-w-7xl space-y-2 px-4 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/auth/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Sign in</Button>
              </Link>
              <Link to="/auth/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full bg-teal-gradient text-navy-deep">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="border-t border-border/40 bg-navy-deep text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-gradient">
                <span className="font-display text-lg font-bold text-navy-deep">F</span>
              </div>
              <span className="font-display text-xl font-bold text-white">FundEd</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Transparent, milestone-based research funding secured by the Cardano blockchain.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/browse" className="hover:text-teal">Explore Projects</Link></li>
              <li><Link to="/how-it-works" className="hover:text-teal">How Milestones Work</Link></li>
              <li><Link to="/transparency" className="hover:text-teal">Transparency Ledger</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Roles</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/dashboard/student" className="hover:text-teal">Student Portal</Link></li>
              <li><Link to="/dashboard/university" className="hover:text-teal">University Portal</Link></li>
              <li><Link to="/dashboard/donor" className="hover:text-teal">Donor Portal</Link></li>
              <li><Link to="/dashboard/admin" className="hover:text-teal">Admin Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#" className="hover:text-teal">FAQ</a></li>
              <li><a href="#" className="hover:text-teal">Contact</a></li>
              <li><a href="#" className="hover:text-teal">Cardano Explorer</a></li>
              <li><a href="#" className="hover:text-teal">Terms & Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} FundEd. Built on Cardano. Undergraduate research thesis project.
        </div>
      </div>
    </footer>
  );
}

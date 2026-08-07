import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  Building2,
  ShieldCheck,
  Heart,
  Users,
  Coins,
  ClipboardCheck,
  FileCheck2,
  Flag,
  BarChart3,
  BookOpen,
  Search,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: any };

const navs: Record<string, { title: string; badge: string; items: NavItem[] }> = {
  student: {
    title: "Student Portal",
    badge: "Student",
    items: [
      { to: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard/student/submit", label: "Submit Project", icon: FolderKanban },
      { to: "/dashboard/student/milestones", label: "Milestones", icon: ClipboardCheck },
      { to: "/dashboard/student/wallet", label: "Wallet", icon: Wallet },
      { to: "/dashboard/student/updates", label: "Updates", icon: Bell },
    ],
  },
  university: {
    title: "University Portal",
    badge: "University",
    items: [
      { to: "/dashboard/university", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard/university/students", label: "Student Verifications", icon: Users },
      { to: "/dashboard/university/projects", label: "Project Reviews", icon: FileCheck2 },
      { to: "/dashboard/university/milestones", label: "Milestone Reviews", icon: ClipboardCheck },
      { to: "/dashboard/university/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  admin: {
    title: "Admin Console",
    badge: "Admin",
    items: [
      { to: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard/admin/approvals", label: "Final Approvals", icon: FileCheck2 },
      { to: "/dashboard/admin/releases", label: "Fund Releases", icon: Coins },
      { to: "/dashboard/admin/ledger", label: "Ledger", icon: BookOpen },
      { to: "/dashboard/admin/disputes", label: "Disputes", icon: Flag },
      { to: "/dashboard/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  donor: {
    title: "Donor Portal",
    badge: "Donor",
    items: [
      { to: "/dashboard/donor", label: "Impact", icon: Heart },
      { to: "/dashboard/donor/donations", label: "My Donations", icon: Coins },
      { to: "/dashboard/donor/wallet", label: "Wallet", icon: Wallet },
      { to: "/dashboard/donor/watchlist", label: "Watchlist", icon: Bell },
      { to: "/dashboard/donor/profile", label: "Profile", icon: Settings },
    ],
  },
};

const roleIcons = {
  student: GraduationCap,
  university: Building2,
  admin: ShieldCheck,
  donor: Heart,
};

export function DashboardShell({ role, children }: { role: keyof typeof navs; children?: ReactNode }) {
  const cfg = navs[role];
  const RoleIcon = roleIcons[role as keyof typeof roleIcons];
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-gradient">
            <span className="font-display text-lg font-bold text-navy-deep">F</span>
          </div>
          <span className="font-display text-lg font-bold text-white">FundEd</span>
        </Link>

        <div className="mx-4 mb-4 rounded-xl bg-sidebar-accent p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal/20 text-teal">
              <RoleIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50">Role</div>
              <div className="text-sm font-semibold text-white">{cfg.badge}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {cfg.items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-teal-gradient text-navy-deep shadow-glow-teal"
                    : "text-white/70 hover:bg-sidebar-accent hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Exit dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
          <h1 className="font-display text-lg font-semibold">{cfg.title}</h1>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-teal"
            />
          </div>
          <button className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal" />
          </button>
          <div className="h-9 w-9 rounded-full bg-teal-gradient" />
        </header>

        <main className="flex-1 p-6 md:p-8">{children ?? <Outlet />}</main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-border bg-background px-2 py-2 md:hidden">
        {cfg.items.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${active ? "text-teal" : "text-muted-foreground"}`}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

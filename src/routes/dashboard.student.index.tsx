import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { motion } from "framer-motion";
import { CheckCircle2, Coins, Users, Bell, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projects, formatRs, toAda } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/student/")({
  component: StudentHome,
});

function StudentHome() {
  const p = projects[0];
  const pct = Math.round((p.raised / p.goal) * 100);

  return (
    <DashboardShell role="student">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/5 p-4"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-gradient text-navy-deep">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Your project is live and funding.</div>
            <div className="text-xs text-muted-foreground">Milestone 1 released · Milestone 2 in progress.</div>
          </div>
          <Badge className="bg-teal text-navy-deep">Live</Badge>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Raised" value={formatRs(p.raised)} hint={`≈ ${toAda(p.raised)} ADA`} icon={Coins} />
          <StatCard label="Goal Progress" value={`${pct}%`} hint={`of ${formatRs(p.goal)}`} icon={CheckCircle2} accent="gold" />
          <StatCard label="Donors" value={p.donors.toString()} hint="+8 this week" icon={Users} />
          <StatCard label="Days Left" value={p.daysLeft.toString()} hint="Live campaign" icon={Clock} accent="navy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.category}</p>
              </div>
              <Link to="/project/$slug" params={{ slug: p.slug }}>
                <Button variant="outline" size="sm">View public page <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </Link>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }} className="h-full bg-teal-gradient" />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {p.milestones.map((m, i) => (
                <div key={m.id} className={`rounded-xl border p-4 ${m.status === "released" ? "border-teal/50 bg-teal/5" : m.status === "active" ? "border-gold/40 bg-gold/5" : "border-border bg-muted/30"}`}>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">M{i + 1} · {m.percent}%</div>
                  <div className="mt-1 font-semibold">{m.title}</div>
                  <Badge variant="outline" className="mt-2 capitalize">{m.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display font-semibold"><Bell className="h-4 w-4 text-teal" /> Notifications</h3>
            <div className="space-y-3">
              {[
                { t: "New donation: Rs. 5,000", d: "2h ago" },
                { t: "Milestone 1 funds released ✅", d: "1d ago" },
                { t: "New comment from Nishan A.", d: "2d ago" },
                { t: "University approved your update", d: "4d ago" },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl p-2 hover:bg-muted/50">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-teal" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.t}</div>
                    <div className="text-xs text-muted-foreground">{n.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

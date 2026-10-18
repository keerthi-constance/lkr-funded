import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Users, ShieldCheck, ExternalLink } from "lucide-react";
import { formatRs, platformStats, recentDonations, shortHash } from "@/lib/mock-data";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/dashboard/admin/")({
  component: AdminHome,
});

const series = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  amount: 200000 + Math.round(Math.sin(i / 3) * 80000 + Math.random() * 100000),
}));
const uniLeaders = [
  { uni: "UOM", projects: 34 },
  { uni: "UOC", projects: 28 },
  { uni: "UOP", projects: 22 },
  { uni: "USJ", projects: 18 },
  { uni: "UOK", projects: 14 },
];

function AdminHome() {
  return (
    <DashboardShell role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground">Full-platform metrics and oversight.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Raised" value={formatRs(platformStats.totalRaised)} hint="Across all live campaigns" icon={Coins} />
          <StatCard label="Commission (2%)" value={formatRs(platformStats.commission)} hint="Available to withdraw" icon={TrendingUp} accent="gold" />
          <StatCard label="Active Projects" value={platformStats.activeProjects.toString()} hint="Live campaigns" icon={ShieldCheck} />
          <StatCard label="Total Donors" value={platformStats.donors.toString()} hint="Unique donors" icon={Users} accent="navy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <h3 className="font-display font-semibold">Donations over time</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14E0C4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#14E0C4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="amount" stroke="#14E0C4" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">University leaderboard</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uniLeaders} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="uni" stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="projects" fill="#F2B84B" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <ReleaseCenter />
        <LedgerTable />
      </div>
    </DashboardShell>
  );
}

function ReleaseCenter() {
  const [pending, setPending] = useState([
    { id: 1, project: "Solar Desalination for Coastal Villages", milestone: "Prototype Development", amount: 480000 },
    { id: 2, project: "AI-Driven Crop Disease Detection", milestone: "Field Testing", amount: 195000 },
  ]);
  const release = (id: number) => {
    setPending(pending.filter((p) => p.id !== id));
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ["#14E0C4", "#F2B84B"] });
    toast.success("Funds released. Ledger ref: fundEd_9f3c...c3b8");
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Fund Release Center</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{pending.length} milestones awaiting</span>
          <Link to="/dashboard/admin/releases" className="text-xs font-semibold text-teal hover:underline">Open full center →</Link>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {pending.map((p) => {
          const fee = Math.round(p.amount * 0.02);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.project}</div>
                <div className="text-xs text-muted-foreground">{p.milestone}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{formatRs(p.amount)}</div>
                <div className="text-xs text-muted-foreground">Fee {formatRs(fee)} · Net {formatRs(p.amount - fee)}</div>
              </div>
              <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => release(p.id)}>Release Funds</Button>
            </div>
          );
        })}
        {pending.length === 0 && <div className="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">All caught up! 🎉</div>}
      </div>
    </div>
  );
}

function LedgerTable() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Recent Transactions</h3>
        <Link to="/dashboard/admin/ledger">
          <Button variant="outline" size="sm">Open full ledger</Button>
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="pb-2 text-left">Donor</th>
              <th className="pb-2 text-left">Project</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-left pl-3">Tx Hash</th>
              <th className="pb-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentDonations.slice(0, 8).map((d) => (
              <tr key={d.id}>
                <td className="py-3 font-medium">{d.donor}</td>
                <td className="py-3 max-w-xs truncate text-muted-foreground">{d.project}</td>
                <td className="py-3 text-right font-semibold">{formatRs(d.amount)}</td>
                <td className="py-3 pl-3"><a className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline" href="#">{shortHash(d.payhereOrderId)} <ExternalLink className="h-3 w-3" /></a></td>
                <td className="py-3 text-right text-xs text-muted-foreground">{d.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

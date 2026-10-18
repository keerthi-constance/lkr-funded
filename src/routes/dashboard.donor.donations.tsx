import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Coins, Heart, Trophy } from "lucide-react";
import { projects, formatRs, shortHash } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/donor/donations")({
  component: DonationsPage,
});

const amounts = [5000, 2500, 10000, 1500, 7500, 3000, 8200, 500];

function DonationsPage() {
  const rows = projects.map((p, i) => ({
    project: p,
    amount: amounts[i % amounts.length],
    milestoneIdx: i % 3,
  }));
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">My Donations</h1>
          <p className="text-muted-foreground">Every project and milestone you've helped fund.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Donated" value={formatRs(total)} icon={Coins} />
          <StatCard label="Projects Supported" value={rows.length.toString()} icon={Heart} accent="gold" />
          <StatCard label="Milestones Helped Complete" value="14" icon={Trophy} accent="navy" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-4 text-left">Project</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-left">Milestone Status</th>
                <th className="p-4 text-right">Date</th>
                <th className="p-4 text-right">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ project, amount, milestoneIdx }) => (
                <tr key={project.id}>
                  <td className="p-4">
                    <Link to="/project/$slug" params={{ slug: project.slug }} className="font-medium hover:text-teal">{project.title}</Link>
                  </td>
                  <td className="p-4 text-right font-semibold">{formatRs(amount)}</td>
                  <td className="p-4"><span className="rounded-full bg-teal/15 px-2 py-0.5 text-xs font-semibold text-teal capitalize">{project.milestones[milestoneIdx]?.status ?? "active"}</span></td>
                  <td className="p-4 text-right text-xs text-muted-foreground">{new Date(Date.now() - milestoneIdx * 7 * 86400000).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <a href="#" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">{shortHash(`fundEd_${project.id}9f3c8b2a7e4d1f6c8b9e2d5a7f1c3b8e`)} <ExternalLink className="h-3 w-3" /></a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

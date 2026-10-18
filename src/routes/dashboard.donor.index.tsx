import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Heart, Trophy, Coins, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { formatRs, projects, shortHash } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/donor/")({
  component: DonorHome,
});

const badges = [
  { name: "First Donation", desc: "Made your first contribution", color: "bg-teal-gradient text-navy-deep" },
  { name: "Milestone Hero", desc: "Helped complete 5 milestones", color: "bg-gold-gradient text-navy-deep" },
  { name: "Category Explorer", desc: "Backed 3+ different fields", color: "bg-navy text-teal" },
];

function DonorHome() {
  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Your Impact</h1>
          <p className="text-muted-foreground">Every donation, every milestone you helped fund.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Donated" value={formatRs(47500)} icon={Coins} />
          <StatCard label="Projects Supported" value="8" hint="Across 5 categories" icon={Heart} accent="gold" />
          <StatCard label="Milestones Helped Complete" value="14" hint="Ledger verified" icon={Trophy} accent="navy" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Your badges</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {badges.map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-5 ${b.color}`}
              >
                <Trophy className="h-6 w-6" />
                <div className="mt-3 font-display font-bold">{b.name}</div>
                <div className="text-xs opacity-80">{b.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold">My Donations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 text-left">Project</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-left pl-3">Status</th>
                  <th className="pb-2 text-right">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.slice(0, 5).map((p, i) => (
                  <tr key={p.id}>
                    <td className="py-3">
                      <Link to="/project/$slug" params={{ slug: p.slug }} className="font-medium hover:text-teal">
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-3 text-right font-semibold">{formatRs([5000, 2500, 10000, 1500, 7500][i])}</td>
                    <td className="py-3 pl-3"><span className="rounded-full bg-teal/15 px-2 py-0.5 text-xs font-semibold text-teal">M{(i % 3) + 1} Released</span></td>
                    <td className="py-3 text-right"><a href="#" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">{shortHash(`tx_${i}9f3c8b2a7e4d1f6c8b9e2d5a7f1c3b8e`)} <ExternalLink className="h-3 w-3" /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

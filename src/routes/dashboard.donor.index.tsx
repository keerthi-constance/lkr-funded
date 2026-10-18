import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Heart, Trophy, Coins, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { formatRs, shortHash } from "@/lib/mock-data";
import { getMyDonations } from "@/backend/functions";

export const Route = createFileRoute("/dashboard/donor/")({
  loader: async () => ({ donations: await getMyDonations() }),
  component: DonorHome,
});

const badges = [
  { name: "First Donation", desc: "Made your first contribution", color: "bg-teal-gradient text-navy-deep" },
  { name: "Milestone Hero", desc: "Helped complete 5 milestones", color: "bg-gold-gradient text-navy-deep" },
  { name: "Category Explorer", desc: "Backed 3+ different fields", color: "bg-navy text-teal" },
];

function DonorHome() {
  const { donations } = Route.useLoaderData();
  const confirmed = donations.filter((d) => d.status === "confirmed");
  const totalDonated = confirmed.reduce((s, d) => s + d.amount, 0);
  const projectsSupported = new Set(confirmed.map((d) => d.projectSlug)).size;
  const earnedBadges = badges.filter((_, i) =>
    i === 0 ? confirmed.length > 0 : i === 2 ? projectsSupported >= 3 : false,
  );

  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Your Impact</h1>
          <p className="text-muted-foreground">Every donation, every milestone you helped fund.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Donated" value={formatRs(totalDonated)} icon={Coins} />
          <StatCard
            label="Projects Supported"
            value={projectsSupported.toString()}
            hint={`${confirmed.length} confirmed donations`}
            icon={Heart}
            accent="gold"
          />
          <StatCard
            label="Donations Pending"
            value={donations.filter((d) => d.status === "pending").length.toString()}
            hint="Awaiting payment confirmation"
            icon={Trophy}
            accent="navy"
          />
        </div>

        {earnedBadges.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Your badges</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {earnedBadges.map((b, i) => (
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
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold">My Donations</h3>
          {donations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't made any donations yet.{" "}
              <Link to="/browse" className="text-teal hover:underline">
                Browse projects
              </Link>{" "}
              to get started.
            </p>
          ) : (
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
                  {donations.slice(0, 5).map((d) => (
                    <tr key={d.id}>
                      <td className="py-3">
                        <Link
                          to="/project/$slug"
                          params={{ slug: d.projectSlug }}
                          className="font-medium hover:text-teal"
                        >
                          {d.projectTitle}
                        </Link>
                      </td>
                      <td className="py-3 text-right font-semibold">{formatRs(d.amount)}</td>
                      <td className="py-3 pl-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                            d.status === "confirmed"
                              ? "bg-teal/15 text-teal"
                              : d.status === "pending"
                                ? "bg-gold/15 text-gold"
                                : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {d.ledgerAvailable && d.ledgerTxId ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-teal">
                            {shortHash(d.ledgerTxId)} <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not on ledger</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

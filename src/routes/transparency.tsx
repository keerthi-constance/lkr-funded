import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ExternalLink } from "lucide-react";
import { shortHash, formatRs } from "@/lib/mock-data";
import { StatCard } from "@/components/stat-card";
import { Coins, ShieldCheck, TrendingUp } from "lucide-react";
import { getPlatformStats, getRecentDonations } from "@/backend/functions";

export const Route = createFileRoute("/transparency")({
  loader: async () => {
    const [platformStats, recentDonations] = await Promise.all([getPlatformStats(), getRecentDonations()]);
    return { platformStats, recentDonations };
  },
  head: () => ({
    meta: [
      { title: "Transparency Ledger — FundEd" },
      { name: "description", content: "Public ledger audit trail of every donation and milestone release." },
    ],
  }),
  component: TransparencyPage,
});

function TransparencyPage() {
  const { platformStats, recentDonations } = Route.useLoaderData();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Transparency Ledger</h1>
        <p className="mt-3 text-muted-foreground">A public, real-time record of every donation and milestone release on the platform.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Raised" value={formatRs(platformStats.totalRaised)} icon={Coins} />
          <StatCard label="Milestones Released" value={platformStats.milestonesCompleted.toString()} icon={ShieldCheck} accent="gold" />
          <StatCard label="Platform Commission" value={formatRs(platformStats.commission)} icon={TrendingUp} accent="navy" />
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold">Recent transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 text-left">Type</th>
                  <th className="pb-2 text-left">Project</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 pl-3 text-left">Tx Hash</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentDonations.map((d, i) => (
                  <tr key={d.id}>
                    <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i % 4 === 0 ? "bg-gold/15 text-gold" : "bg-teal/15 text-teal"}`}>{i % 4 === 0 ? "Release" : "Donation"}</span></td>
                    <td className="py-3 max-w-xs truncate">{d.projectTitle}</td>
                    <td className="py-3 text-right font-semibold">{formatRs(d.amount)}</td>
                    <td className="py-3 pl-3"><a href="#" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">{shortHash(d.payhereOrderId)} <ExternalLink className="h-3 w-3" /></a></td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

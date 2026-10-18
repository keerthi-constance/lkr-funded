import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Coins, Heart, Trophy } from "lucide-react";
import { formatRs, shortHash } from "@/lib/mock-data";
import { getMyDonations } from "@/backend/functions";

export const Route = createFileRoute("/dashboard/donor/donations")({
  loader: async () => ({ donations: await getMyDonations() }),
  component: DonationsPage,
});

function DonationsPage() {
  const { donations } = Route.useLoaderData();
  const confirmed = donations.filter((d) => d.status === "confirmed");
  const total = confirmed.reduce((s, d) => s + d.amount, 0);
  const projectsSupported = new Set(confirmed.map((d) => d.projectSlug)).size;

  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">My Donations</h1>
          <p className="text-muted-foreground">Every project and milestone you've helped fund.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Donated" value={formatRs(total)} icon={Coins} />
          <StatCard label="Projects Supported" value={projectsSupported.toString()} icon={Heart} accent="gold" />
          <StatCard
            label="Donations Pending"
            value={donations.filter((d) => d.status === "pending").length.toString()}
            icon={Trophy}
            accent="navy"
          />
        </div>

        {donations.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            You haven't made any donations yet.{" "}
            <Link to="/browse" className="text-teal hover:underline">
              Browse projects
            </Link>{" "}
            to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-4 text-left">Project</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Date</th>
                  <th className="p-4 text-right">Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="p-4">
                      <Link to="/project/$slug" params={{ slug: d.projectSlug }} className="font-medium hover:text-teal">
                        {d.projectTitle}
                      </Link>
                    </td>
                    <td className="p-4 text-right font-semibold">{formatRs(d.amount)}</td>
                    <td className="p-4">
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
                    <td className="p-4 text-right text-xs text-muted-foreground">
                      {new Date(d.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-teal">
                        {shortHash(d.payhereOrderId)} <ExternalLink className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

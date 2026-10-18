import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { motion } from "framer-motion";
import { CheckCircle2, Coins, Users, Bell, ArrowRight, Clock, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRs } from "@/lib/mock-data";
import { getMyProject } from "@/backend/functions";

export const Route = createFileRoute("/dashboard/student/")({
  loader: async () => ({ project: await getMyProject() }),
  component: StudentHome,
});

function StudentHome() {
  const { project: p } = Route.useLoaderData();

  if (!p) {
    return (
      <DashboardShell role="student">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/15 text-teal">
            <FolderPlus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">You haven't submitted a project yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit your research project for university review to start raising funds.
          </p>
          <Link to="/dashboard/student/submit">
            <Button className="mt-5 bg-teal-gradient text-navy-deep">
              Submit Your Project <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const pct = Math.round((p.raised / p.goal) * 100);
  const statusLabel =
    p.status === "review" ? "Awaiting Review" : p.status === "funded" ? "Funded" : "Live";

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
            <div className="font-semibold">
              {p.status === "review" ? "Your project is under university review." : "Your project is live and funding."}
            </div>
            <div className="text-xs text-muted-foreground">
              {p.status === "review"
                ? "You'll be notified once it's approved and published."
                : `${p.milestones.filter((m) => m.status === "released").length} of ${p.milestones.length} milestones released.`}
            </div>
          </div>
          <Badge className="bg-teal text-navy-deep">{statusLabel}</Badge>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Raised" value={formatRs(p.raised)} icon={Coins} />
          <StatCard label="Goal Progress" value={`${pct}%`} hint={`of ${formatRs(p.goal)}`} icon={CheckCircle2} accent="gold" />
          <StatCard label="Donors" value={p.donors.toString()} icon={Users} />
          <StatCard label="Days Left" value={p.daysLeft.toString()} hint="Live campaign" icon={Clock} accent="navy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.category}</p>
              </div>
              {p.status !== "review" && (
                <Link to="/project/$slug" params={{ slug: p.slug }}>
                  <Button variant="outline" size="sm">View public page <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                </Link>
              )}
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
            {p.status === "review" ? (
              <p className="text-sm text-muted-foreground">
                No notifications yet — you'll see updates here once your university reviews your submission.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No new notifications.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

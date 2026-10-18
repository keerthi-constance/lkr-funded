import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Gavel, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRs } from "@/lib/mock-data";
import { getEligibleProjectsForAuction, scheduleAuction, getUpcomingAuctions } from "@/backend/auction-functions";

export const Route = createFileRoute("/dashboard/admin/auctions")({
  loader: async () => ({
    eligible: await getEligibleProjectsForAuction(),
    upcoming: await getUpcomingAuctions(),
  }),
  component: AuctionsAdminPage,
});

const statusStyles: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  live: "bg-teal text-navy-deep",
};

function AuctionsAdminPage() {
  const loaderData = Route.useLoaderData();
  const [eligible, setEligible] = useState(loaderData.eligible);
  const [upcoming, setUpcoming] = useState(loaderData.upcoming);
  const [selectedSlug, setSelectedSlug] = useState(loaderData.eligible[0]?.slug ?? "");
  const [dateTime, setDateTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const [nextEligible, nextUpcoming] = await Promise.all([
      getEligibleProjectsForAuction(),
      getUpcomingAuctions(),
    ]);
    setEligible(nextEligible);
    setUpcoming(nextUpcoming);
    if (!nextEligible.some((p) => p.slug === selectedSlug)) {
      setSelectedSlug(nextEligible[0]?.slug ?? "");
    }
  };

  const submit = async () => {
    setError("");
    if (!selectedSlug) {
      setError("Pick a project.");
      return;
    }
    if (!dateTime) {
      setError("Pick a date and time.");
      return;
    }
    setBusy(true);
    try {
      await scheduleAuction({
        data: { projectSlug: selectedSlug, scheduledAt: new Date(dateTime).toISOString() },
      });
      toast.success("Auction scheduled.");
      setDateTime("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't schedule this auction.");
    } finally {
      setBusy(false);
    }
  };

  const selectedProject = eligible.find((p) => p.slug === selectedSlug);

  return (
    <DashboardShell role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Auctions</h1>
          <p className="text-muted-foreground">
            Schedule a completed project (all milestones released) for public auction.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Gavel className="h-4 w-4 text-teal" /> Schedule a new auction
          </h2>
          {eligible.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No fully-completed projects are available to auction yet — every milestone must be
              released first.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project
                </label>
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {eligible.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.title}</option>
                  ))}
                </select>
                {selectedProject && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Starting price: {formatRs(selectedProject.goal)} (the project's funding goal)
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date & time
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                {error && (
                  <div className="mb-3 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                    {error}
                  </div>
                )}
                <Button onClick={submit} disabled={busy} className="bg-teal-gradient text-navy-deep">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling…
                    </>
                  ) : (
                    "Schedule Auction"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-display font-semibold">Scheduled &amp; live auctions</h2>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <div className="rounded-xl bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No auctions scheduled yet.
              </div>
            )}
            {upcoming.map((a) => (
              <div
                key={a.projectSlug}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.projectTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.scheduledAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatRs(a.currentBid ?? a.startingPrice)}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.currentBid ? "current bid" : "starting price"}
                  </div>
                </div>
                <Badge className={statusStyles[a.status]}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

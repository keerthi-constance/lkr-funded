import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Coins, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRs, shortHash } from "@/lib/mock-data";
import {
  getPendingReleases,
  releaseMilestoneFunds,
  getAllMilestonesForAdmin,
  setBeneficiaryAccount,
  markMilestoneVerified,
  type PendingRelease,
  type AdminMilestoneRow,
} from "@/backend/functions";

export const Route = createFileRoute("/dashboard/admin/releases")({
  loader: async () => {
    const [pending, allMilestones] = await Promise.all([
      getPendingReleases(),
      getAllMilestonesForAdmin(),
    ]);
    return { pending, allMilestones };
  },
  component: FundReleaseCenter,
});

const statusStyles: Record<AdminMilestoneRow["status"], string> = {
  locked: "bg-muted text-muted-foreground",
  active: "bg-teal/20 text-teal border-teal/40",
  submitted: "bg-gold/20 text-gold-foreground border-gold/40",
  verified: "bg-teal/30 text-teal border-teal",
  released: "bg-teal-gradient text-navy-deep",
};

function FundReleaseCenter() {
  const loaderData = Route.useLoaderData();
  const [pending, setPending] = useState<PendingRelease[]>(loaderData.pending);
  const [rows, setRows] = useState<AdminMilestoneRow[]>(loaderData.allMilestones);
  const [accountDrafts, setAccountDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [modal, setModal] = useState<PendingRelease | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ledgerTxId, setLedgerTxId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPending(loaderData.pending);
    setRows(loaderData.allMilestones);
  }, [loaderData]);

  const refresh = async () => {
    const [nextPending, nextRows] = await Promise.all([
      getPendingReleases(),
      getAllMilestonesForAdmin(),
    ]);
    setPending(nextPending);
    setRows(nextRows);
  };

  const doRelease = async (item: PendingRelease) => {
    setProcessing(true);
    setError("");
    try {
      const result = await releaseMilestoneFunds({
        data: { slug: item.slug, milestoneId: item.milestoneId },
      });
      setLedgerTxId(result.ledgerTxId);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ["#14E0C4", "#F2B84B"],
      });
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Release failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const saveAccount = async (row: AdminMilestoneRow) => {
    const account = (accountDrafts[row.slug] ?? row.payoutAccount).trim();
    if (!account) return;
    setBusyKey(`account:${row.slug}`);
    try {
      await setBeneficiaryAccount({ data: { slug: row.slug, payoutAccount: account } });
      toast.success(`Payout account linked for ${row.projectTitle}.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link payout account.");
    } finally {
      setBusyKey(null);
    }
  };

  const verify = async (row: AdminMilestoneRow) => {
    setBusyKey(`verify:${row.milestoneId}`);
    try {
      await markMilestoneVerified({ data: { slug: row.slug, milestoneId: row.milestoneId } });
      toast.success(`"${row.milestoneTitle}" marked verified.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify milestone.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Fund Release Center</h1>
            <p className="text-muted-foreground">{pending.length} milestones awaiting release.</p>
          </div>

          <div className="space-y-3">
            {pending.map((p, i) => (
              <motion.div
                key={p.milestoneId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.projectTitle}</div>
                  <div className="text-xs text-muted-foreground">{p.milestoneTitle}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatRs(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    Milestone share of total funds raised
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-teal-gradient text-navy-deep"
                  onClick={() => setModal(p)}
                >
                  Release Funds
                </Button>
              </motion.div>
            ))}
            {pending.length === 0 && (
              <div className="rounded-2xl bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                All caught up! 🎉
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-bold">Milestone Manager</h2>
            <p className="text-sm text-muted-foreground">
              Link a payout account and mark milestones verified so they show up above for release.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Milestone</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Payout Account</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draftValue = accountDrafts[row.slug] ?? row.payoutAccount;
                  const canVerify = row.status === "active" || row.status === "submitted";
                  return (
                    <tr key={`${row.slug}-${row.milestoneId}`} className="border-t border-border">
                      <td className="max-w-[180px] truncate p-3 font-medium">{row.projectTitle}</td>
                      <td className="p-3 text-muted-foreground">{row.milestoneTitle}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={statusStyles[row.status]}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Input
                          value={draftValue}
                          onChange={(e) =>
                            setAccountDrafts((d) => ({ ...d, [row.slug]: e.target.value }))
                          }
                          placeholder="Bank name, account no., branch..."
                          className="h-8 w-56 text-xs"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyKey === `account:${row.slug}` || !draftValue.trim()}
                            onClick={() => saveAccount(row)}
                          >
                            Save Account
                          </Button>
                          <Button
                            size="sm"
                            className="bg-teal-gradient text-navy-deep"
                            disabled={!canVerify || busyKey === `verify:${row.milestoneId}`}
                            onClick={() => verify(row)}
                          >
                            Mark Verified
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={!!modal}
        onOpenChange={(o) => {
          if (!o) {
            setModal(null);
            setLedgerTxId("");
            setError("");
          }
        }}
      >
        <DialogContent>
          {!ledgerTxId ? (
            <>
              <DialogHeader>
                <DialogTitle>Release milestone funds</DialogTitle>
              </DialogHeader>
              {modal && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Milestone</span>
                      <span className="font-medium">{modal.milestoneTitle}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-border pt-2">
                      <span className="font-semibold">Amount to release</span>
                      <span className="font-bold text-teal">{formatRs(modal.amount)}</span>
                    </div>
                  </div>
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                      {error}
                    </div>
                  )}
                  {processing ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      <div className="pulse-ring mx-auto grid h-10 w-10 place-items-center rounded-full bg-teal-gradient text-navy-deep">
                        <Coins className="h-5 w-5" />
                      </div>
                      <p className="mt-3">Recording the release...</p>
                    </div>
                  ) : (
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setModal(null)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-teal-gradient text-navy-deep"
                        onClick={() => doRelease(modal)}
                      >
                        Confirm Release
                      </Button>
                    </DialogFooter>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-gradient shadow-glow-teal"
              >
                <CheckCircle2 className="h-7 w-7 text-navy-deep" />
              </motion.div>
              <h3 className="mt-4 font-display text-xl font-bold">Milestone marked released</h3>
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-left text-xs">
                <div className="text-muted-foreground">Ledger reference</div>
                <div className="mt-1 truncate font-mono">{shortHash(ledgerTxId)}</div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The disbursement instruction will be sent to the payout account once the ledger
                integration is live.
              </p>
              <Button
                className="mt-5 w-full bg-teal-gradient text-navy-deep"
                onClick={() => {
                  setModal(null);
                  setLedgerTxId("");
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

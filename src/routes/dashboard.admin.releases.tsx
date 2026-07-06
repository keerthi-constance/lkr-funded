import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Coins, CheckCircle2, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRs, shortHash } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/admin/releases")({
  component: FundReleaseCenter,
});

const initialPending = [
  { id: 1, project: "Solar Desalination for Coastal Villages", milestone: "Prototype Development", amount: 480000 },
  { id: 2, project: "AI-Driven Crop Disease Detection for Sri Lankan Paddy Farms", milestone: "Field Testing & Publication", amount: 195000 },
  { id: 3, project: "Autonomous Underwater Robot for Coral Reef Mapping", milestone: "Research Setup & Materials", amount: 216000 },
];

function FundReleaseCenter() {
  const [pending, setPending] = useState(initialPending);
  const [selected, setSelected] = useState<number[]>([]);
  const [modal, setModal] = useState<typeof initialPending[number] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState("");

  const doRelease = (ids: number[]) => {
    setProcessing(true);
    setTimeout(() => {
      const hash = "tx_" + Math.random().toString(16).slice(2) + "9f3c8b2a7e4d1f6c8b9e2d5a7f1c3b8e";
      setTxHash(hash);
      setPending((p) => p.filter((x) => !ids.includes(x.id)));
      setSelected((s) => s.filter((id) => !ids.includes(id)));
      setProcessing(false);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: ["#14E0C4", "#F2B84B"] });
    }, 1500);
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Fund Release Center</h1>
            <p className="text-muted-foreground">{pending.length} milestones awaiting on-chain release.</p>
          </div>
          {selected.length > 0 && (
            <Button className="bg-teal-gradient text-navy-deep" onClick={() => doRelease(selected)}>
              <Coins className="mr-1.5 h-4 w-4" /> Bulk Release ({selected.length})
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {pending.map((p, i) => {
            const fee = Math.round(p.amount * 0.02);
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.project}</div>
                  <div className="text-xs text-muted-foreground">{p.milestone}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatRs(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">Fee {formatRs(fee)} · Net {formatRs(p.amount - fee)}</div>
                </div>
                <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => setModal(p)}>Release Funds</Button>
              </motion.div>
            );
          })}
          {pending.length === 0 && <div className="rounded-2xl bg-muted/30 p-8 text-center text-sm text-muted-foreground">All caught up! 🎉</div>}
        </div>
      </div>

      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) { setModal(null); setTxHash(""); } }}>
        <DialogContent>
          {!txHash ? (
            <>
              <DialogHeader><DialogTitle>Release milestone funds</DialogTitle></DialogHeader>
              {modal && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="flex justify-between"><span className="text-muted-foreground">Milestone amount</span><span className="font-medium">{formatRs(modal.amount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Commission (2%)</span><span className="font-medium">{formatRs(Math.round(modal.amount * 0.02))}</span></div>
                    <div className="mt-2 flex justify-between border-t border-border pt-2"><span className="font-semibold">Net to student</span><span className="font-bold text-teal">{formatRs(modal.amount - Math.round(modal.amount * 0.02))}</span></div>
                  </div>
                  {processing ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      <div className="pulse-ring mx-auto grid h-10 w-10 place-items-center rounded-full bg-teal-gradient text-navy-deep"><Coins className="h-5 w-5" /></div>
                      <p className="mt-3">Processing on-chain transaction...</p>
                    </div>
                  ) : (
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
                      <Button className="bg-teal-gradient text-navy-deep" onClick={() => doRelease([modal.id])}>Confirm Release</Button>
                    </DialogFooter>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-gradient shadow-glow-teal">
                <CheckCircle2 className="h-7 w-7 text-navy-deep" />
              </motion.div>
              <h3 className="mt-4 font-display text-xl font-bold">Funds released on-chain</h3>
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-left text-xs">
                <div className="text-muted-foreground">Transaction Hash</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono">{shortHash(txHash)}</span>
                  <a href="#" className="inline-flex flex-none items-center gap-1 font-semibold text-teal hover:underline">Explorer <ExternalLink className="h-3 w-3" /></a>
                </div>
              </div>
              <Button className="mt-5 w-full bg-teal-gradient text-navy-deep" onClick={() => { setModal(null); setTxHash(""); }}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

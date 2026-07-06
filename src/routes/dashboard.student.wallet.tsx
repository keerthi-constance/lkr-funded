import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Wallet, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { formatRs, shortHash, toAda } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/student/wallet")({
  component: WalletPage,
});

const payoutHistory = [
  { id: "w1", milestone: "Milestone 1: Research Setup & Materials", amount: 249900, date: "3 weeks ago", txHash: "tx_0a8f3c9b2e7d4a1f6c8b9e2d5a7f1c3b8" },
];

function WalletPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const address = "addr1qxy2v8k9f3c9b2e7d4a1f6c8b9e2d5a7f1c3b8e0a8f3c9b2e";
  const balance = 1842.5;

  const connect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      toast.success("Wallet connected!");
    }, 1400);
  };

  return (
    <DashboardShell role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Connect your Cardano wallet to receive milestone payouts.</p>
        </div>

        {!connected ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-teal">
              {connecting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Wallet className="h-6 w-6" />
                </motion.div>
              ) : (
                <Wallet className="h-6 w-6" />
              )}
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{connecting ? "Connecting..." : "No wallet connected"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Connect Nami, Eternl, or Lace to view your balance and receive payouts.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["Nami", "Eternl", "Lace"].map((w) => (
                <Button key={w} variant="outline" disabled={connecting} onClick={connect}>
                  {w}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-teal/40 bg-teal/5 p-6"
          >
            <div className="flex items-center gap-2 text-teal">
              <div className="pulse-ring grid h-9 w-9 place-items-center rounded-full bg-teal-gradient text-navy-deep">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="font-semibold">Wallet connected</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Address</div>
                <button
                  className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm hover:text-teal"
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                >
                  {shortHash(address)} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Balance</div>
                <div className="mt-1 font-display text-2xl font-bold">{balance.toLocaleString()} ADA</div>
                <div className="text-xs text-muted-foreground">≈ {formatRs(Math.round(balance * 172))}</div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Released Funds History</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 text-left">Milestone</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-left pl-3">Tx Hash</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payoutHistory.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium">{p.milestone}</td>
                    <td className="py-3 text-right font-semibold">{formatRs(p.amount)}<div className="text-xs font-normal text-muted-foreground">≈ {toAda(p.amount)} ADA</div></td>
                    <td className="py-3 pl-3">
                      <a href="#" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">
                        {shortHash(p.txHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            Payouts are triggered automatically once the Admin releases a verified milestone — this page is read-only.
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

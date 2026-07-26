import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Wallet, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { formatRs, shortHash, toAda } from "@/lib/mock-data";
import {
  SUPPORTED_WALLETS,
  WALLET_LABELS,
  getInstalledWalletKeys,
  connectWallet,
  type WalletKey,
  type ConnectedWallet,
} from "@/lib/cardano-wallet";

export const Route = createFileRoute("/dashboard/student/wallet")({
  component: WalletPage,
});

const payoutHistory = [
  { id: "w1", milestone: "Milestone 1: Research Setup & Materials", amount: 249900, date: "3 weeks ago", txHash: "tx_0a8f3c9b2e7d4a1f6c8b9e2d5a7f1c3b8" },
];

function WalletPage() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [installed, setInstalled] = useState<WalletKey[]>([]);

  useEffect(() => {
    setInstalled(getInstalledWalletKeys());
  }, []);

  const connect = async (key: WalletKey) => {
    setConnecting(key);
    try {
      const connected = await connectWallet(key);
      setWallet(connected);
      toast.success(`${WALLET_LABELS[key].name} connected!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <DashboardShell role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Connect your Cardano wallet to receive milestone payouts.</p>
        </div>

        {!wallet ? (
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
            <h3 className="mt-4 font-display text-lg font-semibold">{connecting ? `Connecting to ${WALLET_LABELS[connecting].name}...` : "No wallet connected"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Connect Nami, Eternl, or Lace to view your balance and receive payouts.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUPPORTED_WALLETS.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  disabled={connecting !== null}
                  onClick={() => connect(key)}
                  title={installed.includes(key) ? undefined : "Not installed in this browser"}
                >
                  {WALLET_LABELS[key].name}{!installed.includes(key) && <span className="ml-1 text-muted-foreground">(not installed)</span>}
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
              <span className="font-semibold">{WALLET_LABELS[wallet.key].name} connected</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Address</div>
                <button
                  className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm hover:text-teal"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.address);
                    toast.success("Address copied");
                  }}
                >
                  {shortHash(wallet.address)} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Balance</div>
                <div className="mt-1 font-display text-2xl font-bold">{wallet.balanceAda.toLocaleString()} ADA</div>
                <div className="text-xs text-muted-foreground">≈ {formatRs(Math.round(wallet.balanceAda * 172))}</div>
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

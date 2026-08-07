import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shortHash } from "@/lib/mock-data";
import {
  SUPPORTED_WALLETS,
  WALLET_LABELS,
  getInstalledWalletKeys,
  connectWallet,
  signTxWitness,
  type WalletKey,
  type ConnectedWallet,
} from "@/lib/cardano-wallet";
import { getWallet, getWalletTxHistory, buildDepositTx, submitDepositTx, confirmDeposit, requestWithdrawal, type WalletTxRecord } from "@/backend/functions";

const LOVELACE_PER_ADA = 1_000_000;
const MIN_WITHDRAWAL_ADA = 2;
const OWNER_KEY_STORAGE = "fundEd.walletOwnerKey";
const EXPLORER_TX_URL = "https://preprod.cardanoscan.io/transaction/";

const adaToLovelace = (ada: number) => Math.round(ada * LOVELACE_PER_ADA);
const lovelaceToAda = (lovelace: number) => (lovelace / LOVELACE_PER_ADA).toFixed(2);

function useOwnerKey() {
  const [ownerKey, setOwnerKey] = useState("");
  useEffect(() => {
    setOwnerKey(localStorage.getItem(OWNER_KEY_STORAGE) ?? "");
  }, []);
  const save = (key: string) => {
    setOwnerKey(key);
    localStorage.setItem(OWNER_KEY_STORAGE, key);
  };
  return [ownerKey, save] as const;
}

export function PlatformWallet() {
  const [ownerKey, setOwnerKey] = useOwnerKey();
  const [ownerKeyDraft, setOwnerKeyDraft] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ["platform-wallet", ownerKey],
    queryFn: () => getWallet({ data: ownerKey }),
    enabled: !!ownerKey,
  });

  const historyQuery = useQuery({
    queryKey: ["platform-wallet-history", ownerKey],
    queryFn: () => getWalletTxHistory({ data: ownerKey }),
    enabled: !!ownerKey,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-wallet", ownerKey] });
    queryClient.invalidateQueries({ queryKey: ["platform-wallet-history", ownerKey] });
  };

  if (!ownerKey) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-teal">
          <Wallet className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">Identify your account</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Enter an email or account name to load your platform wallet. This app doesn&apos;t have real login yet — anyone with the same key can see this balance.
        </p>
        <div className="mx-auto mt-5 flex max-w-xs gap-2">
          <Input placeholder="you@example.com" value={ownerKeyDraft} onChange={(e) => setOwnerKeyDraft(e.target.value)} />
          <Button disabled={!ownerKeyDraft.trim()} onClick={() => setOwnerKey(ownerKeyDraft.trim())}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  const balanceLovelace = walletQuery.data?.balanceLovelace ?? 0;
  const history = historyQuery.data ?? [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-teal/40 bg-teal/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Account</div>
            <div className="font-mono text-sm">{ownerKey}</div>
          </div>
          <button className="text-xs text-muted-foreground underline hover:text-teal" onClick={() => setOwnerKey("")}>
            Switch account
          </button>
        </div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Platform balance</div>
          <div className="mt-1 font-display text-3xl font-bold">
            {walletQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${lovelaceToAda(balanceLovelace)} tADA`}
          </div>
          <div className="text-xs text-muted-foreground">Cardano preprod testnet — test ADA, no real value</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => setDepositOpen(true)}>
            <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Deposit
          </Button>
          <Button variant="outline" onClick={() => setWithdrawOpen(true)} disabled={balanceLovelace <= 0}>
            <ArrowUpFromLine className="mr-1.5 h-4 w-4" /> Withdraw
          </Button>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold">Transaction history</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 text-left">Type</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-left pl-3">Status</th>
                <th className="pb-2 text-left pl-3">Tx Hash</th>
                <th className="pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {history.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 font-medium capitalize">{tx.type}</td>
                  <td className="py-3 text-right font-semibold">{lovelaceToAda(tx.amountLovelace)} tADA</td>
                  <td className="py-3 pl-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="py-3 pl-3">
                    {tx.txHash ? (
                      <a href={`${EXPLORER_TX_URL}${tx.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">
                        {shortHash(tx.txHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} ownerKey={ownerKey} onSettled={refresh} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} ownerKey={ownerKey} balanceLovelace={balanceLovelace} onSettled={refresh} />
    </div>
  );
}

function StatusBadge({ status }: { status: WalletTxRecord["status"] }) {
  const styles: Record<WalletTxRecord["status"], string> = {
    pending: "bg-amber-500/10 text-amber-600",
    submitted: "bg-amber-500/10 text-amber-600",
    confirmed: "bg-teal/10 text-teal",
    failed: "bg-red-500/10 text-red-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>{status}</span>;
}

function DepositDialog({
  open,
  onOpenChange,
  ownerKey,
  onSettled,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  ownerKey: string;
  onSettled: () => void;
}) {
  const [amountAda, setAmountAda] = useState(10);
  const [step, setStep] = useState<"amount" | "wallet" | "processing" | "pending" | "confirmed" | "failed">("amount");
  const [installed, setInstalled] = useState<WalletKey[]>([]);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const reset = () => {
    setStep("amount");
    setAmountAda(10);
    setInstalled([]);
    setConnecting(null);
    setError("");
    setTxHash("");
    if (pollRef.current) clearInterval(pollRef.current);
    pollCountRef.current = 0;
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (hash: string) => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const result = await confirmDeposit({ data: hash });
        if (result.status === "confirmed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("confirmed");
          onSettled();
        } else if (result.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("failed");
        } else if (pollCountRef.current >= 36) {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("Still not confirmed after 3 minutes — check the explorer link, it may just be a slow block.");
        }
      } catch {
        // transient network error while polling — keep trying until the cap.
      }
    }, 5000);
  };

  const pickWallet = async (key: WalletKey) => {
    setConnecting(key);
    setError("");
    try {
      const wallet: ConnectedWallet = await connectWallet(key);
      if (!wallet.api) throw new Error("Wallet connected but no signing API available.");

      setStep("processing");
      const utxosCbor = await wallet.api.getUtxos();
      if (!utxosCbor || utxosCbor.length === 0) {
        throw new Error("No funded UTXOs found in this wallet. Fund it from the Cardano preprod faucet first.");
      }

      const amountLovelace = adaToLovelace(amountAda);
      const { unsignedTxCbor } = await buildDepositTx({
        data: { ownerKey, changeAddress: wallet.address, utxosCbor, amountLovelace },
      });
      const witnessCbor = await signTxWitness(wallet.api, unsignedTxCbor);
      const { txHash: hash } = await submitDepositTx({
        data: { ownerKey, unsignedTxCbor, witnessCbor, amountLovelace },
      });

      setTxHash(hash);
      setStep("pending");
      startPolling(hash);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deposit failed. Please try again.";
      setError(msg);
      toast.error(msg);
      setStep("wallet");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 300); }}>
      <DialogContent className="max-w-md">
        {step === "amount" && (
          <>
            <DialogHeader>
              <DialogTitle>Deposit tADA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount (tADA)</Label>
                <Input type="number" min={1} value={amountAda} onChange={(e) => setAmountAda(Number(e.target.value) || 0)} className="mt-2 text-lg font-semibold" />
              </div>
              <p className="text-xs text-muted-foreground">
                You&apos;ll sign a real transaction sending test ADA from your connected Eternl wallet to the platform treasury on Cardano preprod.
              </p>
            </div>
            <DialogFooter>
              <Button
                disabled={amountAda <= 0}
                onClick={() => {
                  setInstalled(getInstalledWalletKeys());
                  setStep("wallet");
                }}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "wallet" && (
          <>
            <DialogHeader>
              <DialogTitle>Connect your wallet</DialogTitle>
            </DialogHeader>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap justify-center gap-2 py-4">
              {SUPPORTED_WALLETS.map((key) => (
                <Button key={key} variant="outline" disabled={connecting !== null} onClick={() => pickWallet(key)}>
                  {connecting === key ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  {WALLET_LABELS[key].name}
                  {!installed.includes(key) && <span className="ml-1 text-muted-foreground">(not installed)</span>}
                </Button>
              ))}
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
            <p className="text-sm text-muted-foreground">Building and signing the deposit transaction — approve it in your wallet popup.</p>
          </div>
        )}

        {step === "pending" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
            <p className="text-sm font-medium">Transaction submitted — waiting for confirmation on-chain.</p>
            <a href={`${EXPLORER_TX_URL}${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">
              {shortHash(txHash)} <ExternalLink className="h-3 w-3" />
            </a>
            {error && <p className="text-xs text-amber-600">{error}</p>}
          </div>
        )}

        {step === "confirmed" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-teal-gradient text-navy-deep">✓</div>
            <p className="font-display font-semibold">Deposit confirmed</p>
            <a href={`${EXPLORER_TX_URL}${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">
              {shortHash(txHash)} <ExternalLink className="h-3 w-3" />
            </a>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-600">✕</div>
            <p className="font-display font-semibold">Deposit failed verification</p>
            <p className="text-sm text-muted-foreground">The transaction didn&apos;t pay the treasury address with a valid owner tag — contact support if this seems wrong.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  open,
  onOpenChange,
  ownerKey,
  balanceLovelace,
  onSettled,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  ownerKey: string;
  balanceLovelace: number;
  onSettled: () => void;
}) {
  const [amountAda, setAmountAda] = useState(MIN_WITHDRAWAL_ADA);
  const [toAddress, setToAddress] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "done" | "error">("form");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setStep("form");
    setAmountAda(MIN_WITHDRAWAL_ADA);
    setToAddress("");
    setTxHash("");
    setError("");
  };

  const submit = async () => {
    setStep("processing");
    setError("");
    try {
      const result = await requestWithdrawal({
        data: { ownerKey, amountLovelace: adaToLovelace(amountAda), toAddress: toAddress.trim() },
      });
      setTxHash(result.txHash);
      setStep("done");
      onSettled();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed.";
      setError(msg);
      toast.error(msg);
      setStep("error");
    }
  };

  const maxAda = Number(lovelaceToAda(balanceLovelace));

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 300); }}>
      <DialogContent className="max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Withdraw tADA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount (tADA)</Label>
                <Input
                  type="number"
                  min={MIN_WITHDRAWAL_ADA}
                  max={maxAda}
                  value={amountAda}
                  onChange={(e) => setAmountAda(Number(e.target.value) || 0)}
                  className="mt-2 text-lg font-semibold"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Available: {lovelaceToAda(balanceLovelace)} tADA · minimum withdrawal {MIN_WITHDRAWAL_ADA} tADA
                </p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Destination address</Label>
                <Input placeholder="addr_test1..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="mt-2 font-mono text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={amountAda < MIN_WITHDRAWAL_ADA || amountAda > maxAda || !toAddress.trim()} onClick={submit}>
                Withdraw
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
            <p className="text-sm text-muted-foreground">Treasury is signing and submitting the withdrawal transaction...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-teal-gradient text-navy-deep">✓</div>
            <p className="font-display font-semibold">Withdrawal submitted</p>
            <a href={`${EXPLORER_TX_URL}${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline">
              {shortHash(txHash)} <ExternalLink className="h-3 w-3" />
            </a>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-600">✕</div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => setStep("form")}>Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

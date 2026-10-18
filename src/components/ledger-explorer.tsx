import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Blocks,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatRs, shortHash } from "@/lib/mock-data";
import {
  getLedgerExplorer,
  getLedgerTransactionDetails,
  type LedgerMilestone,
} from "@/backend/functions";

// Self-hosted Hyperledger Explorer (see fabric/explorer/README.md) — like
// Cardanoscan was for the old Cardano flow, but for a permissioned network
// there's no public site; this only resolves on the machine actually
// running the Fabric network + explorer containers.
const EXPLORER_BASE_URL = "http://localhost:8090";

function openInExplorer(fullTxId: string) {
  navigator.clipboard.writeText(fullTxId).catch(() => {});
  window.open(`${EXPLORER_BASE_URL}/#/transactions`, "_blank", "noopener,noreferrer");
  toast.success("Full transaction ID copied — paste it into the Explorer's search box.");
}

const milestoneStatusStyle: Record<
  LedgerMilestone["status"],
  { icon: typeof Clock; label: string; color: string }
> = {
  PENDING: { icon: Lock, label: "Pending", color: "bg-muted text-muted-foreground" },
  EVIDENCE_SUBMITTED: {
    icon: FileText,
    label: "Evidence submitted",
    color: "bg-gold/20 text-gold-foreground border-gold/40",
  },
  APPROVED: { icon: ShieldCheck, label: "Approved", color: "bg-teal/30 text-teal border-teal" },
  REJECTED: { icon: XCircle, label: "Rejected", color: "bg-destructive/15 text-destructive" },
  DISBURSED: { icon: CheckCircle2, label: "Disbursed", color: "bg-teal-gradient text-navy-deep" },
};

// The raw block/transaction proof for one contribution, read directly off
// the chain via Fabric's qscc — block number, block hash, and validation
// status, as opposed to the app-formatted view above. Fetched on demand
// (only once expanded) rather than eagerly for every contribution.
function RawTransactionPanel({ txId }: { txId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["ledger-tx", txId],
    queryFn: () => getLedgerTransactionDetails({ data: txId }),
  });

  if (isPending) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-navy-deep/5 p-2.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Reading the block from Fabric…
      </div>
    );
  }

  if (isError || !data.available) {
    return (
      <div className="mt-2 rounded-lg bg-destructive/10 p-2.5 text-[11px] text-destructive">
        Couldn&apos;t read this transaction's block from the network right now.
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Channel", data.channelName],
    ["Block number", data.blockNumber],
    ["Block hash", data.blockDataHash],
    ["Previous block hash", data.previousBlockHash],
    ["Validation", data.validationCode],
  ];

  return (
    <div className="mt-2 space-y-1 rounded-lg border border-border bg-navy-deep/5 p-2.5 text-[11px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3">
          <span className="flex-none text-muted-foreground">{label}</span>
          <span className="truncate font-mono text-right text-foreground">{value}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => openInExplorer(txId)}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-teal/40 bg-teal/10 py-1.5 font-sans text-[11px] font-medium text-teal hover:bg-teal/20"
      >
        Open on Hyperledger Explorer <ExternalLink className="h-3 w-3" />
      </button>
      <p className="pt-0.5 text-center text-[10px] leading-snug text-muted-foreground">
        Only works from this machine — Explorer runs locally alongside the Fabric network.
      </p>
    </div>
  );
}

export function LedgerExplorer({
  open,
  onOpenChange,
  campaignId,
  highlightContributionId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  campaignId: string;
  /** contributionId (Mongo Donation _id) to visually highlight, e.g. right after donating */
  highlightContributionId?: string;
}) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const { data, isPending, isError } = useQuery({
    queryKey: ["ledger-explorer", campaignId],
    queryFn: () => getLedgerExplorer({ data: campaignId }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal" />
            Ledger Explorer
          </DialogTitle>
          <DialogDescription>
            Every contribution and milestone decision for this project, recorded on FundEd's
            Hyperledger Fabric network — endorsed by both the platform and the verifying university.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the ledger…
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Couldn&apos;t reach the ledger explorer. Please try again.
          </div>
        )}

        {data && !data.available && (
          <div className="rounded-2xl border border-border bg-muted/40 p-5 text-center">
            <ShieldQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 font-semibold">Ledger not reachable right now</div>
            <p className="mt-1 text-sm text-muted-foreground">
              The Hyperledger Fabric network isn&apos;t connected — this can happen if it isn&apos;t
              running, or if you&apos;re viewing the deployed site while the network only runs
              locally. Your donation is still recorded in FundEd's database either way.
            </p>
          </div>
        )}

        {data && data.available && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold">{data.campaign.title}</h3>
                <Badge variant="outline" className="border-teal/40 bg-teal/10 text-teal">
                  {formatRs(data.campaign.targetAmountLKR)} target
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {data.campaign.milestones.map((m) => {
                  const s = milestoneStatusStyle[m.status];
                  const Icon = s.icon;
                  return (
                    <div
                      key={m.milestoneId}
                      className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      <div
                        className={`grid h-8 w-8 flex-none place-items-center rounded-full ${s.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {m.targetPercent}% of funds
                        </div>
                      </div>
                      <Badge variant="outline" className={s.color}>
                        {s.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contributions ({data.contributions.length})
              </div>
              <div className="mt-2 space-y-2">
                {data.contributions.length === 0 && (
                  <div className="rounded-xl bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                    No contributions recorded yet.
                  </div>
                )}
                {data.contributions.map((c) => (
                  <div
                    key={c.contributionId}
                    className={`rounded-xl border p-3 text-xs ${
                      c.contributionId === highlightContributionId
                        ? "border-teal bg-teal/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{formatRs(c.amountLKR)}</span>
                      <span className="text-muted-foreground">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="truncate font-mono">
                        ledger tx: {shortHash(c.ledgerTxId)}
                      </span>
                      {c.contributionId === highlightContributionId && (
                        <Badge className="bg-teal-gradient text-navy-deep">Your donation</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTxId(expandedTxId === c.ledgerTxId ? null : c.ledgerTxId)
                      }
                      className="mt-1.5 flex items-center gap-1 text-teal hover:underline"
                    >
                      <Blocks className="h-3 w-3" />
                      {expandedTxId === c.ledgerTxId ? "Hide" : "View"} on the blockchain
                      {expandedTxId === c.ledgerTxId ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                    {expandedTxId === c.ledgerTxId && <RawTransactionPanel txId={c.ledgerTxId} />}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Recorded by chaincode requiring endorsement from both the platform (Org1) and the
              verifying university (Org2) — see fabric/chaincode/funded for the source.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

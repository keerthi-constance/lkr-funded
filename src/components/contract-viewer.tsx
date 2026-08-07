import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Coins,
  ExternalLink,
  Lock,
  RotateCcw,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getContractInfo } from "@/backend/functions";

const EXPLORER_ADDRESS_URL = "https://preprod.cardanoscan.io/address/";
const EXPLORER_POLICY_URL = "https://preprod.cardanoscan.io/tokenPolicy/";

const truncate = (v: string) => (v.length <= 24 ? v : `${v.slice(0, 14)}…${v.slice(-8)}`);

export function ContractViewer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  // Deterministic for a given deployment, so it never needs refetching once
  // loaded; only fired when the donor actually opens the panel.
  const { data, isPending, isError } = useQuery({
    queryKey: ["contract-info"],
    queryFn: () => getContractInfo(),
    enabled: open,
    staleTime: Infinity,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal" />
            Smart Contract
          </DialogTitle>
          <DialogDescription>
            Your donation is locked by code on Cardano — not held in anyone&apos;s personal
            wallet. Here is exactly what that code allows.
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading contract details…
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Couldn&apos;t load the contract details. Please try again.
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-teal/40 bg-teal/10 text-teal">
                {data.network}
              </Badge>
              <Badge variant="outline">Plutus {data.plutusVersion.toUpperCase()}</Badge>
              <Badge variant="outline">{data.compiler}</Badge>
            </div>

            <Section
              icon={Lock}
              title="Escrow contract"
              blurb="Holds your ADA from the moment you donate. Funds can leave this address in only two ways, both checked on-chain:"
            >
              <Rule
                icon={ShieldCheck}
                title="Release — to the student"
                body="Requires the platform admin's signature AND the transaction must pay the student at least the full locked amount. Triggered only after a milestone is verified by the university."
              />
              <Rule
                icon={RotateCcw}
                title="Refund — back to you"
                body="Requires YOUR signature AND the transaction must pay you back at least the full locked amount. Nobody else can trigger it, and nobody can take your refund elsewhere."
              />
              <div className="mt-3 space-y-2">
                <HashRow
                  label="Escrow address"
                  value={data.escrowAddress}
                  href={data.escrowAddress ? EXPLORER_ADDRESS_URL + data.escrowAddress : null}
                />
                <HashRow label="Script hash" value={data.escrowScriptHash} href={null} />
              </div>
            </Section>

            <Section
              icon={Coins}
              title="EDUF reward token"
              blurb={`Minted to your own wallet in the very same transaction — ${data.edufPerRs} EDUF for every Rs. 1 you donate. The policy refuses to mint unless a real donation is locked into escrow in that transaction.`}
            >
              <div className="space-y-2">
                <HashRow
                  label="Policy ID"
                  value={data.edufPolicyId}
                  href={data.edufPolicyId ? EXPLORER_POLICY_URL + data.edufPolicyId : null}
                />
                <HashRow label="Asset name" value={data.edufAssetName} href={null} />
              </div>
            </Section>

            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                One atomic transaction
              </div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {[
                  "Your ADA is paid into the escrow script address, tagged with your wallet, the student's wallet, and this project.",
                  `${data.edufPerRs} EDUF per Rs. 1 is minted under the policy above.`,
                  "Those EDUF tokens are paid to your own wallet.",
                  "You sign it. If any step fails, the whole transaction fails — nothing is half-done.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {data.unavailableReason && (
              <p className="text-xs text-amber-600">
                {data.unavailableReason} The contract rules above are read from the compiled
                blueprint and are unaffected.
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Written in Aiken and compiled to Plutus {data.plutusVersion.toUpperCase()}. Rates are
              pegged at Rs. {data.adaRate} per ADA, baked into the minting policy at compile time so
              it can&apos;t be changed without redeploying.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  blurb,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Rule({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-muted/50 p-3">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-teal" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function HashRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
      <div className="flex-1 overflow-hidden">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate font-mono text-xs" title={value ?? undefined}>
          {value ? truncate(value) : "Unavailable"}
        </div>
      </div>
      {value && (
        <button
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`View ${label} on explorer`}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-teal"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

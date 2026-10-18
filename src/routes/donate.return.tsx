import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { LedgerExplorer } from "@/components/ledger-explorer";
import { formatRs } from "@/lib/mock-data";
import { getDonationStatus } from "@/backend/functions";

const searchSchema = z.object({ order_id: z.string().optional() });

export const Route = createFileRoute("/donate/return")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Donation status — FundEd" }] }),
  component: DonateReturn,
});

type Status = "checking" | "pending" | "confirmed" | "failed" | "not_found";

function DonateReturn() {
  const { order_id: orderId } = Route.useSearch();
  const [status, setStatus] = useState<Status>("checking");
  const [amount, setAmount] = useState(0);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [contributionId, setContributionId] = useState("");
  const [explorerOpen, setExplorerOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setStatus("not_found");
      return;
    }

    const check = async () => {
      pollCountRef.current += 1;
      try {
        const result = await getDonationStatus({ data: orderId });
        setAmount(result.amount);
        setProjectTitle(result.projectTitle);
        setProjectSlug(result.projectSlug);
        setContributionId(result.contributionId);
        if (result.status === "confirmed") {
          setStatus("confirmed");
          if (!celebratedRef.current) {
            celebratedRef.current = true;
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.4 },
              colors: ["#14E0C4", "#F2B84B", "#ffffff"],
            });
          }
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (result.status === "failed") {
          setStatus("failed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          setStatus("pending");
          if (pollCountRef.current >= 36 && pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        setStatus("not_found");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    check();
    pollRef.current = setInterval(check, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
          {(status === "checking" || status === "pending") && (
            <>
              <div className="pulse-ring mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-gradient">
                <Clock className="h-7 w-7 text-navy-deep" />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold">Confirming your payment...</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                PayHere is finalizing your donation. This usually takes a few seconds.
              </p>
            </>
          )}
          {status === "confirmed" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-gradient shadow-glow-teal"
              >
                <CheckCircle2 className="h-8 w-8 text-navy-deep" />
              </motion.div>
              <h1 className="mt-6 font-display text-2xl font-bold">Thank you!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your donation of{" "}
                <span className="font-semibold text-foreground">{formatRs(amount)}</span> to{" "}
                {projectTitle} was successful.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full border-teal/40 text-teal hover:bg-teal/10 hover:text-teal"
                onClick={() => setExplorerOpen(true)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" /> View on Ledger
              </Button>
              <Button asChild className="mt-2 w-full bg-teal-gradient text-navy-deep">
                <Link to="/browse">Explore more projects</Link>
              </Button>
            </>
          )}
          {(status === "failed" || status === "not_found") && (
            <>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500/10 text-red-600">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold">
                {status === "not_found"
                  ? "We couldn't find that payment"
                  : "Payment didn't go through"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {status === "not_found"
                  ? "No donation matches this link. If money left your account, contact support."
                  : "No funds were captured. You can try again from the project page."}
              </p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link to="/browse">Back to projects</Link>
              </Button>
            </>
          )}
        </div>
      </main>
      <SiteFooter />

      {projectSlug && (
        <LedgerExplorer
          open={explorerOpen}
          onOpenChange={setExplorerOpen}
          campaignId={projectSlug}
          highlightContributionId={contributionId}
        />
      )}
    </>
  );
}

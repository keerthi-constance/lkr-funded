import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gavel, Loader2, Trophy } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRs } from "@/lib/mock-data";
import { getAuction, placeBid, payForWonAuction } from "@/backend/auction-functions";
import { getCurrentUser } from "@/backend/auth-functions";

export const Route = createFileRoute("/auction/$slug")({
  loader: async ({ params }) => {
    const auction = await getAuction({ data: params.slug });
    if (!auction) throw notFound();
    return { auction };
  },
  component: AuctionPage,
});

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return Math.ceil(remaining / 1000);
}

function AuctionPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: auction } = useQuery({
    queryKey: ["auction", slug],
    queryFn: () => getAuction({ data: slug }),
    initialData: Route.useLoaderData().auction,
    refetchInterval: 1500,
  });
  const { data: currentUser } = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser });

  const [bidAmount, setBidAmount] = useState("");
  const [bidBusy, setBidBusy] = useState(false);
  const [bidError, setBidError] = useState("");
  const [payStep, setPayStep] = useState<"idle" | "card" | "processing">("idle");
  const [card, setCard] = useState({ number: "", exp: "", cvv: "", name: "" });

  const secondsLeft = useCountdown(auction?.endsAt ?? null);

  if (!auction) return null;

  const minNext = (auction.currentBid ?? auction.startingPrice) + 1;

  const submitBid = async () => {
    setBidError("");
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount < minNext) {
      setBidError(`Enter at least Rs. ${minNext.toLocaleString()}.`);
      return;
    }
    setBidBusy(true);
    try {
      await placeBid({ data: { projectSlug: slug, amount } });
      setBidAmount("");
      toast.success("Bid placed! 30-second countdown reset.");
      queryClient.invalidateQueries({ queryKey: ["auction", slug] });
    } catch (err) {
      setBidError(err instanceof Error ? err.message : "Couldn't place that bid.");
    } finally {
      setBidBusy(false);
    }
  };

  const pay = async () => {
    setPayStep("processing");
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await payForWonAuction({ data: slug });
      toast.success("Payment confirmed — you won the auction!");
      queryClient.invalidateQueries({ queryKey: ["auction", slug] });
      setPayStep("idle");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPayStep("card");
    }
  };

  const isWinner = currentUser && auction.winnerUsername === currentUser.username;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-teal">
          <Gavel className="h-4 w-4" /> Project Auction
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">{auction.projectTitle}</h1>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          {auction.status === "scheduled" && (
            <div className="text-center">
              <Badge variant="outline" className="mb-3">Scheduled</Badge>
              <div className="text-lg font-semibold">
                Auction opens {new Date(auction.scheduledAt).toLocaleString()}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Starting price: {formatRs(auction.startingPrice)}
              </p>
            </div>
          )}

          {auction.status === "live" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {auction.currentBid ? "Current bid" : "Starting price"}
                  </div>
                  <div className="font-display text-3xl font-bold text-teal">
                    {formatRs(auction.currentBid ?? auction.startingPrice)}
                  </div>
                  {auction.currentBidderName && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Highest bidder: {auction.currentBidderName}
                    </div>
                  )}
                </div>
                <Badge className="bg-teal text-navy-deep">Live</Badge>
              </div>

              {auction.endsAt && (
                <div className="mt-4 rounded-xl bg-muted/40 p-3 text-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Closes in
                  </div>
                  <div className={`font-display text-2xl font-bold ${secondsLeft <= 10 ? "text-destructive" : ""}`}>
                    {secondsLeft}s
                  </div>
                </div>
              )}

              <div className="mt-5">
                {!currentUser ? (
                  <Link
                    to="/auth/login"
                    search={{ redirect: `/auction/${slug}` }}
                    className="block"
                  >
                    <Button className="w-full bg-teal-gradient text-navy-deep">
                      Sign in to bid
                    </Button>
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Min. Rs. ${minNext.toLocaleString()}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                    />
                    <Button
                      onClick={submitBid}
                      disabled={bidBusy}
                      className="flex-none bg-teal-gradient text-navy-deep"
                    >
                      {bidBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Bid"}
                    </Button>
                  </div>
                )}
                {bidError && <p className="mt-2 text-xs text-destructive">{bidError}</p>}
              </div>
            </div>
          )}

          {auction.status === "unsold" && (
            <div className="text-center">
              <Badge variant="outline" className="mb-3">Unsold</Badge>
              <p className="text-sm text-muted-foreground">
                This auction closed with no bids.
              </p>
            </div>
          )}

          {auction.status === "ended" && (
            <div className="text-center">
              <Trophy className="mx-auto h-8 w-8 text-gold" />
              <div className="mt-2 font-display text-2xl font-bold">
                {formatRs(auction.winningAmount ?? 0)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Won by {auction.winnerName}
                {auction.paymentCompleted && " · Payment received"}
              </p>

              {isWinner && !auction.paymentCompleted && (
                <div className="mx-auto mt-5 max-w-sm text-left">
                  {payStep === "idle" && (
                    <Button
                      className="w-full bg-teal-gradient text-navy-deep"
                      onClick={() => setPayStep("card")}
                    >
                      Pay {formatRs(auction.winningAmount ?? 0)} to claim
                    </Button>
                  )}
                  {payStep === "card" && (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-xs text-muted-foreground">
                        Test mode — any values work here. Nothing typed below is sent anywhere.
                      </p>
                      <Input
                        placeholder="Card number"
                        value={card.number}
                        onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="MM/YY"
                          value={card.exp}
                          onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value }))}
                        />
                        <Input
                          placeholder="CVV"
                          value={card.cvv}
                          onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="Cardholder name"
                        value={card.name}
                        onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                      />
                      <Button className="w-full bg-teal-gradient text-navy-deep" onClick={pay}>
                        Pay {formatRs(auction.winningAmount ?? 0)}
                      </Button>
                    </div>
                  )}
                  {payStep === "processing" && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing payment…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {auction.bids.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Bid history
            </h2>
            <div className="space-y-1.5">
              {auction.bids.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span>{b.bidderName}</span>
                  <span className="font-semibold">{formatRs(b.amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

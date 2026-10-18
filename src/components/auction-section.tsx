import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gavel, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion-primitives";
import { NodeNetwork } from "@/components/node-network";
import { formatRs } from "@/lib/mock-data";
import type { UpcomingAuction } from "@/backend/auction-functions";

function useCountdownParts(target: string) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const tick = () => setMs(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function AuctionCard({ auction }: { auction: UpcomingAuction }) {
  const { days, hours, minutes, seconds } = useCountdownParts(auction.scheduledAt);
  const isLive = auction.status === "live";

  return (
    <Link
      to="/auction/$slug"
      params={{ slug: auction.projectSlug }}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-elevated backdrop-blur-xl transition hover:border-teal/40 hover:bg-white/[0.07]"
    >
      {auction.cover && (
        <div className="h-36 w-full overflow-hidden">
          <img
            src={auction.cover}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <Badge className={isLive ? "bg-teal text-navy-deep" : "border-white/20 bg-white/10 text-white/80"}>
            {isLive ? "Live now" : "Scheduled"}
          </Badge>
          <span className="text-xs text-white/60">
            {formatRs(auction.currentBid ?? auction.startingPrice)}{" "}
            {auction.currentBid ? "current bid" : "starting price"}
          </span>
        </div>
        <h3 className="mt-3 truncate font-display text-lg font-semibold text-white">
          {auction.projectTitle}
        </h3>

        {!isLive && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { v: days, l: "days" },
              { v: hours, l: "hrs" },
              { v: minutes, l: "min" },
              { v: seconds, l: "sec" },
            ].map((u) => (
              <div key={u.l} className="rounded-lg border border-white/10 bg-white/5 py-2">
                <div className="font-display text-lg font-bold text-teal">{u.v}</div>
                <div className="text-[10px] uppercase text-white/50">{u.l}</div>
              </div>
            ))}
          </div>
        )}
        {!isLive && (
          <p className="mt-2 text-xs text-white/50">
            Opens {new Date(auction.scheduledAt).toLocaleString()}
          </p>
        )}
        <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-teal">
          {isLive ? "Bid now" : "View auction"} <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

export function AuctionSection({ auctions }: { auctions: UpcomingAuction[] }) {
  if (auctions.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-hero-gradient py-24 text-white">
      <NodeNetwork className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-teal backdrop-blur">
            <Gavel className="h-3.5 w-3.5" /> Project Auctions
          </div>
          <h2 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Own a piece of <span className="text-teal-gradient">finished research</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Once a project's every milestone is verified and released, it goes to public auction —
            starting at its original funding goal. Anyone can bid; the highest bid standing after a
            30-second countdown wins.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a, i) => (
            <FadeIn key={a.projectSlug} delay={i * 0.08}>
              <AuctionCard auction={a} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

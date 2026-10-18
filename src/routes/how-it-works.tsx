import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { FadeIn } from "@/components/motion-primitives";
import { GraduationCap, Building2, ShieldCheck, Coins } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — FundEd" },
      { name: "description", content: "Learn how milestone-based research funding works on FundEd." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: GraduationCap, title: "1. Student Submits", body: "A final-year student submits a research proposal, budget, and 3 concrete milestones through their university-verified account." },
  { icon: Building2, title: "2. University Verifies", body: "The student's university checks authenticity, feasibility, and supervisor sign-off. Approved projects move to platform review." },
  { icon: ShieldCheck, title: "3. Admin Publishes", body: "The FundEd authority performs a final review and publishes the project. It's now live on the marketplace." },
  { icon: Coins, title: "4. Donors Fund by Milestone", body: "Donors contribute in LKR via PayHere. Funds are released only when each milestone is verified by both university and platform." },
];

function HowItWorks() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">How FundEd works</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Four verified steps between an idea and a fully funded piece of research — every milestone recorded on a permissioned ledger.
          </p>
        </FadeIn>
        <div className="mt-12 space-y-4">
          {steps.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.08}>
              <div className="flex gap-5 rounded-2xl border border-border bg-card p-6">
                <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-teal-gradient text-navy-deep shadow-glow-teal">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">{s.title}</h2>
                  <p className="mt-1 text-muted-foreground">{s.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

import { getProjects, getPlatformStats, getUniversities } from "@/backend/functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [projects, platformStats, universities] = await Promise.all([
      getProjects(),
      getPlatformStats(),
      getUniversities(),
    ]);
    return { projects, platformStats, universities };
  },
  component: LandingLayout,
});

function LandingLayout() {
  const { projects, platformStats, universities } = Route.useLoaderData();
  return <Landing projects={projects} platformStats={platformStats} universities={universities} />;
}

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Lock, Eye, GraduationCap, Building2, CheckCircle2, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NodeNetwork } from "@/components/node-network";
import { CountUp, FadeIn } from "@/components/motion-primitives";
import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/lib/mock-data";

function Landing({
  projects,
  platformStats,
  universities,
}: {
  projects: Project[];
  platformStats: { totalRaised: number; activeProjects: number; universities: number; milestonesCompleted: number; donors: number };
  universities: { name: string; short: string; logo: string }[];
}) {
  return (
    <>
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-hero-gradient text-white">
          <NodeNetwork className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 md:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-teal backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Powered by the Cardano blockchain
              </div>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Fund the next generation of{" "}
                <span className="text-teal-gradient">university research</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
                Transparent, milestone-based crowdfunding for final-year research. Every rupee is
                verified on-chain — released only when work is delivered.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/browse">
                  <Button size="lg" className="bg-teal-gradient text-navy-deep shadow-glow-teal hover:opacity-90">
                    Explore Projects <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard/student/submit">
                  <Button size="lg" variant="outline" className="border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/10">
                    Submit Your Research
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Live stats */}
            <FadeIn delay={0.2} className="mt-16">
              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:grid-cols-3 md:grid-cols-5 md:gap-6">
                {[
                  { label: "Total Raised", value: platformStats.totalRaised, prefix: "Rs. " },
                  { label: "Active Projects", value: platformStats.activeProjects },
                  { label: "Universities", value: platformStats.universities },
                  { label: "Milestones Completed", value: platformStats.milestonesCompleted },
                  { label: "Total Donors", value: platformStats.donors },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="font-display text-2xl font-bold text-teal md:text-3xl">
                      <CountUp end={s.value} prefix={s.prefix} />
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50 md:text-xs">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
              How It Works
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Four steps. Zero opacity.
            </h2>
            <p className="mt-3 text-muted-foreground">
              From submission to funded — every stage is verified by a real institution and
              recorded on the Cardano blockchain.
            </p>
          </FadeIn>

          <div className="relative mt-14 grid gap-6 md:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent md:block" />
            {[
              { icon: GraduationCap, title: "Student Submits", desc: "Research proposal, budget, and 3 milestones." },
              { icon: Building2, title: "University Verifies", desc: "Faculty confirms authenticity and feasibility." },
              { icon: ShieldCheck, title: "Admin Publishes", desc: "Platform authority approves and lists the project." },
              { icon: Coins, title: "Donors Fund by Milestone", desc: "Funds locked on-chain, released as work is verified." },
            ].map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-teal-gradient text-navy-deep shadow-glow-teal">
                    <s.icon className="h-6 w-6" />
                    <div className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* WHY BLOCKCHAIN */}
        <section className="bg-navy-deep py-24 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeIn className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal/15 px-3 py-1 text-xs font-semibold text-teal">
                Trust & Transparency
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Why blockchain?</h2>
              <p className="mt-3 text-white/60">
                Three guarantees traditional crowdfunding cannot provide.
              </p>
            </FadeIn>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                { icon: Lock, title: "Milestone-Locked Funds", desc: "Donations sit in a smart-contract escrow. Funds unlock only when a milestone is verified." },
                { icon: ShieldCheck, title: "Immutable Records", desc: "Every submission, verification, and release is written to the Cardano ledger. Nothing can be edited later." },
                { icon: Eye, title: "Full Public Audit", desc: "Anyone can trace every rupee from donor wallet to student wallet in real time." },
              ].map((s, i) => (
                <FadeIn key={s.title} delay={i * 0.1}>
                  <div className="glass-card rounded-2xl p-7">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-teal/15 text-teal">
                      <s.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-white/60">{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PROJECTS */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <FadeIn className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
                Trending Research
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Projects funding now
              </h2>
            </div>
            <Link to="/browse" className="hidden text-sm font-semibold text-teal hover:underline md:inline-flex">
              View all →
            </Link>
          </FadeIn>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        </section>

        {/* UNIVERSITY MARQUEE */}
        <section className="border-y border-border/40 bg-surface py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Verified partner universities
            </p>
            <div className="mt-6 overflow-hidden">
              <div className="marquee flex w-max gap-14">
                {[...universities, ...universities, ...universities].map((u, i) => (
                  <div key={i} className="flex items-center gap-3 whitespace-nowrap">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-xs font-bold text-teal">
                      {u.logo}
                    </div>
                    <span className="font-display font-semibold text-navy">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <FadeIn className="mx-auto max-w-3xl">
            <div className="relative rounded-3xl border border-border bg-card p-10 shadow-elevated">
              <div className="absolute -top-4 left-10 rounded-full bg-gold-gradient px-3 py-1 text-xs font-bold text-navy-deep shadow-glow-gold">
                ⭐ Funded Alumni
              </div>
              <p className="font-display text-xl italic leading-relaxed text-foreground sm:text-2xl">
                "FundEd didn't just fund my thesis — it gave 234 strangers a stake in it.
                Watching each milestone verify on-chain built the accountability I needed to
                actually finish."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" className="h-12 w-12 rounded-full bg-muted" alt="" />
                <div>
                  <div className="font-semibold">Priya Ratnayake</div>
                  <div className="text-sm text-muted-foreground">Computer Science, University of Moratuwa · Cohort 2024</div>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-navy-deep py-24 text-white">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <FadeIn>
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
              <h2 className="mt-6 font-display text-4xl font-bold sm:text-5xl">
                Ready to back real research?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Join hundreds of donors funding milestones — not promises.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/browse">
                  <Button size="lg" className="bg-teal-gradient text-navy-deep shadow-glow-teal hover:opacity-90">
                    Start Donating <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
                    Create Account
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

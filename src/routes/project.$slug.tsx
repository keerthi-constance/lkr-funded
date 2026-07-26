import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Users,
  Wallet,
  ShieldCheck,
  Share2,
  ExternalLink,
  Lock,
  FileText,
  Play,
  MessageCircle,
  Heart,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRs, toAda, shortHash, type Project, type MilestoneStatus } from "@/lib/mock-data";
import { getProjectBySlug, createDonation } from "@/backend/functions";
import {
  SUPPORTED_WALLETS,
  WALLET_LABELS,
  getInstalledWalletKeys,
  connectWallet,
  type WalletKey,
  type ConnectedWallet,
} from "@/lib/cardano-wallet";

export const Route = createFileRoute("/project/$slug")({
  loader: async ({ params }) => {
    const project = await getProjectBySlug({ data: params.slug });
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.project.title} — FundEd` },
          { name: "description", content: loaderData.project.tagline },
          { property: "og:title", content: loaderData.project.title },
          { property: "og:description", content: loaderData.project.tagline },
          { property: "og:image", content: loaderData.project.cover },
        ]
      : [{ title: "Project — FundEd" }],
  }),
  component: ProjectPage,
});

const milestoneStyles: Record<MilestoneStatus, { color: string; label: string; icon: any }> = {
  locked: { color: "bg-muted text-muted-foreground", label: "Locked", icon: Lock },
  active: { color: "bg-teal/20 text-teal border-teal/40", label: "In Progress", icon: Clock },
  submitted: { color: "bg-gold/20 text-gold-foreground border-gold/40", label: "Under Review", icon: FileText },
  verified: { color: "bg-teal/30 text-teal border-teal", label: "Verified", icon: CheckCircle2 },
  released: { color: "bg-teal-gradient text-navy-deep", label: "Funds Released", icon: CheckCircle2 },
};

function ProjectPage() {
  const { project: loaderProject } = Route.useLoaderData();
  const [project, setProject] = useState(loaderProject);
  const [donateOpen, setDonateOpen] = useState(false);
  const pct = Math.min(100, Math.round((project.raised / project.goal) * 100));

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <div className="relative">
          <div className="relative h-72 overflow-hidden sm:h-96">
            <img src={project.cover} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="-mt-20 relative">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-navy text-white">{project.category}</Badge>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal shadow-glow-teal"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified by {project.university.name}
                  </motion.div>
                </div>
                <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                  {project.title}
                </h1>
                <p className="mt-3 max-w-3xl text-lg text-muted-foreground">{project.tagline}</p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <img src={project.student.avatar} alt="" className="h-11 w-11 rounded-full bg-muted" />
                    <div>
                      <div className="font-semibold">{project.student.name}</div>
                      <div className="text-xs text-muted-foreground">{project.student.department}</div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-xs font-bold text-teal">
                      {project.university.logo}
                    </div>
                    <div className="text-sm">{project.university.name}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content + sticky sidebar */}
            <div className="my-10 grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="milestones">Milestones</TabsTrigger>
                    <TabsTrigger value="updates">Updates</TabsTrigger>
                    <TabsTrigger value="docs">Docs</TabsTrigger>
                    <TabsTrigger value="donors">Donors</TabsTrigger>
                    <TabsTrigger value="comments">Q&A</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6 space-y-6">
                    <div>
                      <h2 className="font-display text-xl font-bold">Abstract</h2>
                      <p className="mt-3 leading-relaxed text-muted-foreground">{project.abstract}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow label="Supervisor" value={project.supervisor} />
                      <InfoRow label="Department" value={project.student.department} />
                      <InfoRow label="Category" value={project.category} />
                      <InfoRow label="Tags" value={project.tags.join(", ")} />
                    </div>
                    <div className="rounded-2xl border border-teal/30 bg-teal/5 p-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-teal" />
                        <div>
                          <div className="font-semibold">Expected Impact</div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Publication in a peer-reviewed venue, open-source release of all designs and datasets,
                            and a working prototype demonstrated at the {project.university.short} annual research symposium.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="milestones" className="mt-6">
                    <MilestoneStepper project={project} />
                  </TabsContent>

                  <TabsContent value="updates" className="mt-6 space-y-4">
                    {project.updates.map((u: { date: string; title: string; body: string }, i: number) => (
                      <div key={i} className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-start justify-between">
                          <h3 className="font-display text-base font-semibold">{u.title}</h3>
                          <span className="text-xs text-muted-foreground">{u.date}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="docs" className="mt-6">
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <div className="flex items-center gap-3">
                        <FileText className="h-10 w-10 text-teal" />
                        <div className="flex-1">
                          <div className="font-semibold">Research_Proposal.pdf</div>
                          <div className="text-xs text-muted-foreground">1.8 MB · uploaded 3 weeks ago</div>
                        </div>
                        <Button variant="outline" size="sm">Download</Button>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
                      <div className="font-semibold mb-3">Budget Breakdown</div>
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-muted-foreground">
                          <tr><th className="pb-2 text-left">Item</th><th className="pb-2 text-right">Cost</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr><td className="py-2">Sensors & electronics</td><td className="py-2 text-right">Rs. 285,000</td></tr>
                          <tr><td className="py-2">Lab consumables</td><td className="py-2 text-right">Rs. 190,000</td></tr>
                          <tr><td className="py-2">Fabrication & 3D printing</td><td className="py-2 text-right">Rs. 145,000</td></tr>
                          <tr><td className="py-2">Field testing & travel</td><td className="py-2 text-right">Rs. 120,000</td></tr>
                          <tr><td className="py-2">Publication fees</td><td className="py-2 text-right">Rs. 110,000</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="donors" className="mt-6">
                    <div className="rounded-2xl border border-border bg-card p-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-xs font-bold text-teal">
                            {["N", "K", "A", "M", "S", "P", "R", "D"][i]}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{["Nishan A.", "Kavya R.", "Anonymous", "M. Perera", "Sanduni B.", "Priya D.", "Ravi J.", "Dilan S."][i]}</div>
                            <div className="text-xs text-muted-foreground">{["Keep going!", "Proud of this work", "", "For future generations 🌱", "Amazing project", "", "Milestone hero!", "Rooting for you"][i]}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatRs([5000, 2500, 10000, 1000, 500, 25000, 7500, 1500][i])}</div>
                            <div className="text-[11px] text-muted-foreground">{i + 1}d ago</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-6">
                    <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                      <MessageCircle className="mx-auto h-8 w-8 opacity-40" />
                      <p className="mt-3">Sign in to ask questions or leave a comment for the research team.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky funding widget */}
              <aside className="lg:sticky lg:top-24 lg:h-fit">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="font-display text-3xl font-bold">{formatRs(project.raised)}</div>
                      <div className="text-xs text-muted-foreground">≈ {toAda(project.raised)} ADA raised of {formatRs(project.goal)}</div>
                    </div>
                    <div className="text-3xl font-bold text-teal">{pct}%</div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-teal-gradient"
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Stat icon={Users} label="Donors" value={project.donors.toString()} />
                    <Stat icon={Clock} label={project.daysLeft > 0 ? "Days Left" : "Status"} value={project.daysLeft > 0 ? project.daysLeft.toString() : "Funded"} />
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setDonateOpen(true)}
                    className="mt-5 w-full bg-teal-gradient text-navy-deep shadow-glow-teal hover:opacity-90"
                  >
                    <Heart className="mr-2 h-4 w-4" /> Donate Now
                  </Button>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Link copied!");
                      }}
                    >
                      <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Heart className="mr-1.5 h-3.5 w-3.5" /> Watchlist
                    </Button>
                  </div>
                  <div className="mt-4 rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-teal" /> Milestone-locked on Cardano</div>
                    <div className="mt-1 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-teal" /> University-verified project</div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />

      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        projectTitle={project.title}
        projectSlug={project.slug}
        onDonated={(raised, donors) => setProject((p) => ({ ...p, raised, donors }))}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function MilestoneStepper({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      {project.milestones.map((m, i) => {
        const s = milestoneStyles[m.status];
        const Icon = s.icon;
        const amount = Math.round((project.goal * m.percent) / 100);
        const isPulse = m.status === "active";
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative flex gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className={`relative grid h-12 w-12 flex-none place-items-center rounded-2xl ${s.color} ${isPulse ? "pulse-ring" : ""}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-semibold">Milestone {i + 1}: {m.title}</h3>
                <Badge variant="outline" className={s.color.includes("bg-teal-gradient") ? "border-teal bg-teal/10 text-teal" : ""}>{s.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{m.percent}% of funds · <span className="font-semibold text-foreground">{formatRs(amount)}</span></span>
                <span>Target: {new Date(m.targetDate).toLocaleDateString()}</span>
                <span>Evidence: {m.evidenceType}</span>
              </div>
              {m.txHash && (
                <a href="#" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">
                  <ExternalLink className="h-3 w-3" /> tx: {shortHash(m.txHash)}
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function DonateDialog({
  open,
  onOpenChange,
  projectTitle,
  projectSlug,
  onDonated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  projectTitle: string;
  projectSlug: string;
  onDonated: (raised: number, donors: number) => void;
}) {
  const [amount, setAmount] = useState(1000);
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [step, setStep] = useState<"amount" | "wallet" | "processing" | "success">("amount");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [installed, setInstalled] = useState<WalletKey[]>([]);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);

  const fee = Math.round(amount * 0.02);
  const net = amount - fee;

  const reset = () => {
    setStep("amount");
    setAmount(1000);
    setMessage("");
    setAnon(false);
    setTxHash("");
    setError("");
    setWallet(null);
    setConnecting(null);
  };

  const goToWallet = () => {
    setInstalled(getInstalledWalletKeys());
    setStep("wallet");
  };

  const pickWallet = async (key: WalletKey) => {
    setConnecting(key);
    setError("");
    try {
      const connected = await connectWallet(key);
      setWallet(connected);
      setStep("processing");
      const result = await createDonation({
        data: { slug: projectSlug, amount, donor: connected.address, message, anonymous: anon },
      });
      setTxHash(result.txHash);
      onDonated(result.raised, result.donors);
      setStep("success");
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.4 },
        colors: ["#14E0C4", "#F2B84B", "#ffffff"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed. Please try again.");
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
              <DialogTitle>Support this research</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[500, 1000, 5000, 10000].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${amount === a ? "border-teal bg-teal/10 text-teal" : "border-border hover:border-teal/50"}`}
                    >
                      Rs. {a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="text-lg font-semibold"
                  />
                  <span className="text-xs text-muted-foreground">≈ {toAda(amount)} ADA</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Your donation</span><span className="font-medium">{formatRs(amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (2%)</span><span className="font-medium">{formatRs(fee)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2"><span className="font-semibold">Student receives</span><span className="font-bold text-teal">{formatRs(net)}</span></div>
              </div>
              <Textarea placeholder="Optional message to the student..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
                Donate anonymously
              </label>
              {error && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
              <Button onClick={goToWallet} className="w-full bg-teal-gradient text-navy-deep">
                Continue to Wallet <Wallet className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        {step === "wallet" && (
          <>
            <DialogHeader><DialogTitle>Connect your wallet</DialogTitle></DialogHeader>
            {error && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
            <div className="space-y-2">
              {SUPPORTED_WALLETS.map((key) => {
                const w = WALLET_LABELS[key];
                const isInstalled = installed.includes(key);
                const isConnecting = connecting === key;
                return (
                  <button
                    key={key}
                    onClick={() => pickWallet(key)}
                    disabled={connecting !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition ${isInstalled ? "hover:border-teal hover:bg-teal/5" : "opacity-60"} disabled:cursor-wait`}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-gradient font-display font-bold text-navy-deep">
                      {isConnecting ? (
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Wallet className="h-4 w-4" />
                        </motion.span>
                      ) : (
                        w.name[0]
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {isConnecting ? "Approve in your wallet..." : isInstalled ? w.desc : "Not installed in this browser"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === "processing" && (
          <div className="py-10 text-center">
            <div className="pulse-ring mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-gradient">
              <Wallet className="h-7 w-7 text-navy-deep" />
            </div>
            <h3 className="mt-6 font-display text-xl font-bold">Recording your donation...</h3>
            <p className="mt-2 text-sm text-muted-foreground">Wallet connected. Saving to the platform ledger.</p>
          </div>
        )}
        {step === "success" && (
          <div className="py-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-gradient shadow-glow-teal"
            >
              <CheckCircle2 className="h-8 w-8 text-navy-deep" />
            </motion.div>
            <h3 className="mt-6 font-display text-2xl font-bold">Thank you!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your donation of <span className="font-semibold text-foreground">{formatRs(amount)}</span> to {projectTitle} was successful.
            </p>
            {wallet && (
              <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
                <div className="text-muted-foreground">Connected Wallet ({WALLET_LABELS[wallet.key].name})</div>
                <div className="mt-1 truncate font-mono">{shortHash(wallet.address)}</div>
                <div className="mt-1 text-muted-foreground">Balance: {wallet.balanceAda.toLocaleString()} ADA</div>
              </div>
            )}
            <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
              <div className="text-muted-foreground">Platform Record ID</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-mono">{shortHash(txHash)}</span>
                <a href="#" className="inline-flex flex-none items-center gap-1 font-semibold text-teal hover:underline">
                  Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button className="w-full bg-teal-gradient text-navy-deep" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

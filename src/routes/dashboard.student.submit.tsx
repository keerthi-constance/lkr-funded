import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/mock-data";
import { getUniversities, getMyProject, submitProject } from "@/backend/functions";

export const Route = createFileRoute("/dashboard/student/submit")({
  loader: async () => ({
    universities: await getUniversities(),
    existingProject: await getMyProject(),
  }),
  component: SubmitWizard,
});

const steps = ["Personal", "Project", "Funding", "Milestones", "Review"];

function SubmitWizard() {
  const { universities, existingProject } = Route.useLoaderData();
  const navigate = useNavigate();

  if (existingProject) {
    return (
      <DashboardShell role="student">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-display text-xl font-bold">You've already submitted a project</h2>
          <p className="mt-2 text-sm text-muted-foreground">{existingProject.title}</p>
          <Link to="/dashboard/student">
            <Button className="mt-5 bg-teal-gradient text-navy-deep">Go to your dashboard</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [department, setDepartment] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [universityShort, setUniversityShort] = useState(universities[0]?.short ?? "");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [tagline, setTagline] = useState("");
  const [abstract, setAbstract] = useState("");

  const [goal, setGoal] = useState(1000000);

  const [milestones, setMilestones] = useState([
    { title: "Research Setup", pct: 30 },
    { title: "Prototype Development", pct: 40 },
    { title: "Field Testing", pct: 30 },
  ]);
  const totalPct = milestones.reduce((s, m) => s + m.pct, 0);

  const [accepted, setAccepted] = useState(false);

  const submit = async () => {
    setError("");
    if (!accepted) {
      setError("Accept the commission terms first.");
      return;
    }
    setBusy(true);
    try {
      const { slug } = await submitProject({
        data: {
          title,
          tagline,
          abstract,
          category,
          department,
          supervisor,
          universityShort,
          goal,
          milestones: milestones.map((m) => ({ title: m.title, percent: m.pct })),
        },
      });
      toast.success("Project submitted for university verification!");
      navigate({ to: "/dashboard/student" });
      void slug;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your project. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const stepValid = [
    department.trim() && supervisor.trim() && universityShort,
    title.trim() && tagline.trim() && abstract.trim(),
    goal > 0,
    totalPct === 100,
    accepted,
  ];

  return (
    <DashboardShell role="student">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-2xl font-bold">Submit Your Research Project</h1>
        <p className="text-muted-foreground">Complete all 5 steps. Your submission will be reviewed by your university.</p>

        {/* Stepper */}
        <div className="mt-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={`flex flex-1 items-center gap-2 rounded-xl border p-3 text-sm transition ${i === step ? "border-teal bg-teal/10" : i < step ? "border-teal/40 bg-teal/5" : "border-border bg-card"}`}>
                <div className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-teal-gradient text-navy-deep" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="hidden font-medium sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Personal & Academic Info</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department" placeholder="e.g. Biomedical Eng." value={department} onChange={(e) => setDepartment(e.target.value)} />
                <Field label="Supervisor name" placeholder="Dr. R. Wijesinghe" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">University</label>
                  <select
                    value={universityShort}
                    onChange={(e) => setUniversityShort(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {universities.map((u) => (
                      <option key={u.short} value={u.short}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Project Details</h2>
              <Field label="Project title" placeholder="e.g. Low-Cost Biosensor for Dengue" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Tagline (1 sentence)" placeholder="Short elevator pitch..." value={tagline} onChange={(e) => setTagline(e.target.value)} />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abstract</label>
                <Textarea rows={6} className="mt-1.5" placeholder="Describe your research, methodology, and expected impact..." value={abstract} onChange={(e) => setAbstract(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover image / video</label>
                <div className="mt-1.5 flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  Drag & drop or click to upload (a stock placeholder is used for now)
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Funding Goal</h2>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total funding needed (Rs.)</label>
                <Input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="mt-1.5 text-lg font-semibold" />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Define 3 Milestones</h2>
              <p className="text-sm text-muted-foreground">Split your funding into 3 verifiable milestones. Percentages must total 100%.</p>
              {milestones.map((m, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <Input value={m.title} onChange={(e) => setMilestones(milestones.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} placeholder="Milestone title" />
                    <div className="flex items-center gap-2">
                      <Input type="number" value={m.pct} onChange={(e) => setMilestones(milestones.map((x, idx) => idx === i ? { ...x, pct: Number(e.target.value) } : x))} className="text-right" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className={`rounded-lg p-3 text-sm font-semibold ${totalPct === 100 ? "bg-teal/10 text-teal" : "bg-destructive/10 text-destructive"}`}>
                Total: {totalPct}% {totalPct === 100 ? "✓" : "(must equal 100%)"}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Review & Submit</h2>
              <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm">
                <div className="font-semibold">{title || "Untitled project"}</div>
                <p className="mt-1 text-muted-foreground">{tagline}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Category: {category}</span>
                  <span>Goal: Rs. {goal.toLocaleString()}</span>
                  <span>Department: {department}</span>
                  <span>Supervisor: {supervisor}</span>
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>I accept the 2% platform commission and understand that funds are released per milestone verification.</span>
              </label>
              {error && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < steps.length - 1 ? (
              <Button
                className="bg-teal-gradient text-navy-deep"
                disabled={!stepValid[step]}
                onClick={() => setStep(step + 1)}
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="bg-teal-gradient text-navy-deep shadow-glow-teal"
                disabled={busy || !accepted}
                onClick={submit}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input className="mt-1.5" {...rest} />
    </div>
  );
}

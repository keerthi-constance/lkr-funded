import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { categories, toAda } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/student/submit")({
  component: SubmitWizard,
});

const steps = ["Personal", "Project", "Funding", "Milestones", "Review"];

function SubmitWizard() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(1000000);
  const [milestones, setMilestones] = useState([
    { title: "Research Setup", pct: 30 },
    { title: "Prototype Development", pct: 40 },
    { title: "Field Testing", pct: 30 },
  ]);
  const totalPct = milestones.reduce((s, m) => s + m.pct, 0);

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
                <Field label="Full name" placeholder="e.g. Aisha Fernando" />
                <Field label="Student ID" placeholder="e.g. 2020/EE/012" />
                <Field label="Department" placeholder="e.g. Biomedical Eng." />
                <Field label="Supervisor name" placeholder="Dr. R. Wijesinghe" />
                <Field label="Supervisor email" placeholder="supervisor@uni.lk" type="email" />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">University</label>
                  <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>University of Colombo</option><option>University of Moratuwa</option><option>University of Peradeniya</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Project Details</h2>
              <Field label="Project title" placeholder="e.g. Low-Cost Biosensor for Dengue" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Tagline (1 sentence)" placeholder="Short elevator pitch..." />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abstract</label>
                <Textarea rows={6} className="mt-1.5" placeholder="Describe your research, methodology, and expected impact..." />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover image / video</label>
                <div className="mt-1.5 flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  Drag & drop or click to upload
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
                <div className="mt-1 text-xs text-muted-foreground">≈ {toAda(goal)} ADA at current rate</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold">Budget breakdown</div>
                  <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" /> Add item</Button>
                </div>
                {["Sensors & electronics", "Lab consumables", "Fabrication"].map((it) => (
                  <div key={it} className="grid grid-cols-[1fr_140px_40px] items-center gap-2 py-2 border-t border-border first:border-0">
                    <Input defaultValue={it} className="h-9" />
                    <Input defaultValue="200000" className="h-9" />
                    <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
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
                  <Textarea rows={2} placeholder="Describe deliverables and required evidence..." className="mt-3" />
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
                <div className="font-semibold">Your project preview will appear here.</div>
                <p className="mt-2 text-muted-foreground">A summary of all fields entered will be shown for confirmation before final submission to your university.</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" />
                <span>I accept the 2% platform commission and understand that funds are released per milestone verification.</span>
              </label>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < steps.length - 1 ? (
              <Button className="bg-teal-gradient text-navy-deep" onClick={() => setStep(step + 1)}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="bg-teal-gradient text-navy-deep shadow-glow-teal" onClick={() => toast.success("Project submitted for university verification!")}>
                Submit for Verification
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

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, Lock, Upload, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { projects, formatRs, shortHash, type MilestoneStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/student/milestones")({
  component: MilestonesPage,
});

const statusStyles: Record<MilestoneStatus, { color: string; label: string; icon: any }> = {
  locked: { color: "bg-muted text-muted-foreground", label: "Locked", icon: Lock },
  active: { color: "bg-teal/20 text-teal", label: "In Progress", icon: Clock },
  submitted: { color: "bg-gold/20 text-gold-foreground", label: "Under Review", icon: FileText },
  verified: { color: "bg-teal/30 text-teal", label: "Verified", icon: CheckCircle2 },
  released: { color: "bg-teal-gradient text-navy-deep", label: "Funds Released", icon: CheckCircle2 },
};

function MilestonesPage() {
  const project = projects[0];
  const [milestones, setMilestones] = useState(project.milestones);
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [cosign, setCosign] = useState("");

  const activeMilestone = milestones.find((m) => m.id === evidenceOpen);

  const submitEvidence = () => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === evidenceOpen ? { ...m, status: "submitted" } : m))
    );
    toast.success("Evidence submitted for university review.");
    setEvidenceOpen(null);
    setReport("");
    setCosign("");
  };

  return (
    <DashboardShell role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Milestone Management</h1>
          <p className="text-muted-foreground">{project.title}</p>
        </div>

        <div className="space-y-4">
          {milestones.map((m, i) => {
            const s = statusStyles[m.status];
            const Icon = s.icon;
            const amount = Math.round((project.goal * m.percent) / 100);
            const overdue = new Date(m.targetDate) < new Date() && m.status !== "released" && m.status !== "verified";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-4">
                    <div className={`relative grid h-11 w-11 flex-none place-items-center rounded-2xl ${s.color} ${m.status === "active" ? "pulse-ring" : ""}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold">Milestone {i + 1}: {m.title}</h3>
                        <Badge variant="outline">{s.label}</Badge>
                        {overdue && <Badge className="bg-destructive/15 text-destructive">Overdue</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{m.percent}% · <span className="font-semibold text-foreground">{formatRs(amount)}</span></span>
                        <span>Target: {new Date(m.targetDate).toLocaleDateString()}</span>
                        <span>Evidence: {m.evidenceType}</span>
                      </div>
                      {m.txHash && (
                        <a href="#" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">
                          <ExternalLink className="h-3 w-3" /> tx: {shortHash(m.txHash)}
                        </a>
                      )}
                    </div>
                  </div>
                  {m.status === "active" && (
                    <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => setEvidenceOpen(m.id)}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit Evidence
                    </Button>
                  )}
                  {m.status === "submitted" && (
                    <Badge className="bg-gold/20 text-gold-foreground">Awaiting university review</Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!evidenceOpen} onOpenChange={(o) => !o && setEvidenceOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Evidence — {activeMilestone?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upload {activeMilestone?.evidenceType}
              </label>
              <div className="mt-1.5 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                Drag & drop or click to upload
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress report</label>
              <Textarea rows={4} className="mt-1.5" value={report} onChange={(e) => setReport(e.target.value)} placeholder="Describe what was completed for this milestone..." />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supervisor co-sign email (optional)</label>
              <Input className="mt-1.5" value={cosign} onChange={(e) => setCosign(e.target.value)} placeholder="supervisor@uni.lk" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceOpen(null)}>Cancel</Button>
            <Button className="bg-teal-gradient text-navy-deep" onClick={submitEvidence}>Submit for Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

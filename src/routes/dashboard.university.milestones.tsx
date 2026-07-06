import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { projects, formatRs } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/university/milestones")({
  component: MilestoneReviewQueue,
});

function MilestoneReviewQueue() {
  const submitted = projects.filter((p) => p.milestones.some((m) => m.status === "submitted" || m.status === "active"));
  const [forwarded, setForwarded] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [audit, setAudit] = useState<{ who: string; action: string; when: string }[]>([
    { who: "Dr. R. Wijesinghe", action: "Verified Milestone 1 evidence", when: "2 weeks ago" },
  ]);

  const approve = (key: string, project: string, milestone: string) => {
    setForwarded((f) => [...f, key]);
    setAudit((a) => [{ who: "You", action: `Approved & forwarded "${milestone}" for ${project}`, when: "Just now" }, ...a]);
    toast.success("Forwarded to Admin for fund release.");
  };
  const reject = (project: string, milestone: string) => {
    setAudit((a) => [{ who: "You", action: `Rejected "${milestone}" for ${project}`, when: "Just now" }, ...a]);
    toast.error("Evidence rejected, student notified.");
  };

  return (
    <DashboardShell role="university">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h1 className="font-display text-2xl font-bold">Milestone Evidence Review</h1>
            <p className="text-muted-foreground">Review submitted evidence before forwarding to Admin for release.</p>
          </div>
          {submitted.map((p) =>
            p.milestones
              .filter((m) => m.status === "submitted" || m.status === "active")
              .map((m, i) => {
                const key = `${p.id}-${m.id}`;
                const isForwarded = forwarded.includes(key);
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{p.title}</div>
                        <h3 className="font-display font-semibold">{m.title}</h3>
                        <div className="mt-1 text-xs text-muted-foreground">{m.percent}% · {formatRs(Math.round((p.goal * m.percent) / 100))}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">{isForwarded ? "forwarded" : m.status}</Badge>
                    </div>
                    <button
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline"
                      onClick={() => toast(`Preview: ${m.evidenceType} evidence`)}
                    >
                      <FileText className="h-3.5 w-3.5" /> View evidence ({m.evidenceType})
                    </button>
                    {!isForwarded && m.status === "submitted" && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => reject(p.title, m.title)}><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                        <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => approve(key, p.title, m.title)}>
                          <Send className="mr-1 h-3.5 w-3.5" /> Approve & Forward to Admin
                        </Button>
                      </div>
                    )}
                    {isForwarded && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-teal"><CheckCircle2 className="h-3.5 w-3.5" /> Forwarded to Admin for release</div>
                    )}
                  </motion.div>
                );
              })
          )}
          <div className="rounded-2xl border border-border bg-card p-4">
            <Textarea rows={2} placeholder="Reviewer comment (applies to next action)..." value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 lg:h-fit">
          <h3 className="mb-4 font-display font-semibold">Audit Trail</h3>
          <div className="space-y-3">
            {audit.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-teal" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{a.who}</div>
                  <div className="text-xs text-muted-foreground">{a.action}</div>
                  <div className="text-[11px] text-muted-foreground">{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

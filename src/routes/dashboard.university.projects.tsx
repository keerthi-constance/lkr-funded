import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, MessageSquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { projects as allProjects, formatRs } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/university/projects")({
  component: ProjectQueue,
});

type Stage = "submitted" | "review" | "approved" | "rejected";

const columns: { key: Stage; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function ProjectQueue() {
  const [stages, setStages] = useState<Record<string, Stage>>(() =>
    Object.fromEntries(allProjects.map((p, i) => [p.id, (["submitted", "review", "submitted", "approved"] as Stage[])[i % 4]]))
  );
  const [detail, setDetail] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const active = allProjects.find((p) => p.id === detail);

  const move = (id: string, next: Stage) => {
    setStages((s) => ({ ...s, [id]: next }));
    toast.success(`Moved to ${next}`);
  };

  const forward = () => {
    if (!confirmed) {
      toast.error("Confirm supervisor verification first.");
      return;
    }
    if (detail) move(detail, "approved");
    toast.success("Approved & forwarded to Admin for final publish.");
    setDetail(null);
    setComment("");
    setConfirmed(false);
  };

  return (
    <DashboardShell role="university">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Project Verification Queue</h1>
          <p className="text-muted-foreground">Drag proposals through the review pipeline.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map((col) => {
            const items = allProjects.filter((p) => stages[p.id] === col.key);
            return (
              <div key={col.key} className="rounded-2xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between px-1 pb-2">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="cursor-pointer rounded-xl border border-border bg-card p-3 hover:border-teal/50"
                      onClick={() => setDetail(p.id)}
                    >
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{p.student.name}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatRs(p.goal)}</span>
                        {col.key !== "approved" && col.key !== "rejected" && (
                          <button
                            className="inline-flex items-center gap-0.5 font-semibold text-teal hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              move(p.id, col.key === "submitted" ? "review" : "approved");
                            }}
                          >
                            Advance <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {items.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{active?.title}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{active.abstract}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/40 p-3"><div className="text-muted-foreground">Goal</div><div className="font-semibold">{formatRs(active.goal)}</div></div>
                <div className="rounded-lg bg-muted/40 p-3"><div className="text-muted-foreground">Supervisor</div><div className="font-semibold">{active.supervisor}</div></div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                Supervisor confirmation received, originality checked, budget is reasonable
              </label>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" /> Comment to student
                </label>
                <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Request changes or leave a note..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { if (detail) move(detail, "rejected"); setDetail(null); }}>Reject</Button>
            <Button variant="outline" onClick={() => toast.success("Change request sent to student.")}>Request Changes</Button>
            <Button className="bg-teal-gradient text-navy-deep" onClick={forward}>Approve & Forward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Calendar, History } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { projects, formatRs } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/admin/approvals")({
  component: ApprovalsQueue,
});

function ApprovalsQueue() {
  const [status, setStatus] = useState<Record<string, "pending" | "published" | "rejected">>(
    Object.fromEntries(projects.map((p, i) => [p.id, i < 5 ? "pending" : "published"]))
  );
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});

  const publish = (id: string) => {
    setStatus((s) => ({ ...s, [id]: "published" }));
    toast.success("Project published to the public feed.");
  };
  const reject = (id: string) => {
    setStatus((s) => ({ ...s, [id]: "rejected" }));
    toast.error("Project rejected.");
  };

  const pending = projects.filter((p) => status[p.id] === "pending");
  const history = projects.filter((p) => status[p.id] !== "pending");

  return (
    <DashboardShell role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Final Project Approval Queue</h1>
          <p className="text-muted-foreground">University-approved projects awaiting platform-wide publish.</p>
        </div>

        <div className="space-y-3">
          {pending.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <img src={p.cover} className="h-14 w-20 rounded-lg object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.university.name} · {formatRs(p.goal)} goal</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={scheduleFor[p.id] ?? ""}
                  onChange={(e) => setScheduleFor((s) => ({ ...s, [p.id]: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reject(p.id)}><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => publish(p.id)}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {scheduleFor[p.id] ? "Schedule Publish" : "Publish Now"}
                </Button>
              </div>
            </motion.div>
          ))}
          {pending.length === 0 && <div className="rounded-2xl bg-muted/30 p-8 text-center text-sm text-muted-foreground">No projects awaiting approval 🎉</div>}
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><History className="h-4 w-4" /> History</h3>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <Badge className={status[p.id] === "published" ? "bg-teal/15 text-teal" : "bg-destructive/15 text-destructive"}>{status[p.id]}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

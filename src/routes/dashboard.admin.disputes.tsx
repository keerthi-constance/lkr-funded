import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Flag, ShieldAlert, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/admin/disputes")({
  component: DisputesPage,
});

type Report = {
  id: string;
  type: "project" | "comment";
  target: string;
  reason: string;
  reportedBy: string;
  status: "open" | "resolved" | "suspended";
};

const seed: Report[] = [
  { id: "r1", type: "project", target: "Smart Prosthetic Hand with EMG Control", reason: "Budget looks inflated compared to milestone deliverables.", reportedBy: "Anonymous donor", status: "open" },
  { id: "r2", type: "comment", target: "Comment by 'guest_2291' on Solar Desalination", reason: "Spam / irrelevant link posted.", reportedBy: "System flag", status: "open" },
  { id: "r3", type: "project", target: "Community Mesh Network for Rural Connectivity", reason: "Duplicate submission of an already-funded idea.", reportedBy: "S. Silva", status: "resolved" },
];

function DisputesPage() {
  const [reports, setReports] = useState(seed);
  const [active, setActive] = useState<Report | null>(null);
  const [notes, setNotes] = useState("");

  const resolve = (action: "resolved" | "suspended") => {
    if (!active) return;
    setReports((rs) => rs.map((r) => (r.id === active.id ? { ...r, status: action } : r)));
    toast.success(action === "suspended" ? "Item suspended." : "Dispute resolved.");
    setActive(null);
    setNotes("");
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Dispute & Flag Management</h1>
          <p className="text-muted-foreground">{reports.filter((r) => r.status === "open").length} open reports</p>
        </div>

        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${r.status === "open" ? "bg-destructive/15 text-destructive" : "bg-teal/15 text-teal"}`}>
                {r.status === "open" ? <Flag className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.target}</div>
                <div className="text-xs text-muted-foreground">{r.reason} · Reported by {r.reportedBy}</div>
              </div>
              <Badge variant="outline" className="capitalize">{r.type}</Badge>
              <Badge className={r.status === "open" ? "bg-gold/15 text-gold-foreground" : r.status === "suspended" ? "bg-destructive/15 text-destructive" : "bg-teal/15 text-teal"}>{r.status}</Badge>
              {r.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => setActive(r)}><ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Review</Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve report</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="font-medium">{active.target}</div>
                <div className="mt-1 text-xs text-muted-foreground">{active.reason}</div>
              </div>
              <Textarea rows={3} placeholder="Resolution notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => resolve("resolved")}>Mark Resolved</Button>
            <Button variant="destructive" onClick={() => resolve("suspended")}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

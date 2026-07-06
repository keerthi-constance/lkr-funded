import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { studentNames } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/university/students")({
  component: StudentQueue,
});

type Row = { id: string; name: string; studentId: string; department: string; email: string; status: "pending" | "approved" | "rejected" };

const seed: Row[] = studentNames.map((name, i) => ({
  id: `s${i}`,
  name,
  studentId: `202${i % 4}/EE/0${10 + i}`,
  department: ["Biomedical Eng.", "Mech. Eng.", "Computer Science", "Marine Sci.", "Materials Sci.", "Agri. Biotech", "Electronic Eng.", "Civil Eng."][i % 8],
  email: `${name.toLowerCase().replace(" ", ".")}@uni.lk`,
  status: "pending",
}));

function StudentQueue() {
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.studentId.includes(query));

  const approve = (id: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    toast.success("Student verified.");
  };
  const bulkApprove = () => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? { ...r, status: "approved" } : r)));
    toast.success(`${selected.length} students approved.`);
    setSelected([]);
  };
  const confirmReject = () => {
    if (!reason.trim()) {
      toast.error("A reject reason is required.");
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === rejectTarget ? { ...r, status: "rejected" } : r)));
    toast.success("Student rejected.");
    setRejectTarget(null);
    setReason("");
  };

  return (
    <DashboardShell role="university">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Student Verification Queue</h1>
            <p className="text-muted-foreground">{filtered.filter((r) => r.status === "pending").length} pending verifications</p>
          </div>
          {selected.length > 0 && (
            <Button className="bg-teal-gradient text-navy-deep" onClick={bulkApprove}>Bulk approve ({selected.length})</Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-4 text-left"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? filtered.filter(r=>r.status==="pending").map((r) => r.id) : [])} /></th>
                <th className="p-4 text-left">Student</th>
                <th className="p-4 text-left">Department</th>
                <th className="p-4 text-left">ID Document</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      disabled={r.status !== "pending"}
                      checked={selected.includes(r.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.studentId} · {r.email}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{r.department}</td>
                  <td className="p-4">
                    <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline" onClick={() => toast("Preview: university_id_card.jpg")}>
                      <FileText className="h-3.5 w-3.5" /> View ID
                    </button>
                  </td>
                  <td className="p-4">
                    <Badge className={r.status === "approved" ? "bg-teal/15 text-teal" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold-foreground"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(r.id)}><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                        <Button size="sm" className="bg-teal-gradient text-navy-deep" onClick={() => approve(r.id)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve</Button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject student verification</DialogTitle></DialogHeader>
          <Textarea rows={3} placeholder="Reason for rejection (required)..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

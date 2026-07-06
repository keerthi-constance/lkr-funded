import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Download, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recentDonations, formatRs, shortHash } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/admin/ledger")({
  component: LedgerPage,
});

function LedgerPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      recentDonations.filter(
        (d) => d.donor.toLowerCase().includes(query.toLowerCase()) || d.project.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  const exportCsv = () => {
    const header = "Donor,Project,Amount,Date,TxHash,Commission\n";
    const rows = filtered
      .map((d) => `"${d.donor}","${d.project}",${d.amount},${d.date},${d.txHash},${Math.round(d.amount * 0.02)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "funded-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Donor & Transaction Ledger</h1>
            <p className="text-muted-foreground">{filtered.length} transactions</p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search donor or project..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-4 text-left">Donor</th>
                <th className="p-4 text-left">Project</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Commission</th>
                <th className="p-4 text-left">Tx Hash</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="p-4 font-medium">{d.donor}</td>
                  <td className="p-4 max-w-xs truncate text-muted-foreground">{d.project}</td>
                  <td className="p-4 text-right font-semibold">{formatRs(d.amount)}</td>
                  <td className="p-4 text-right text-muted-foreground">{formatRs(Math.round(d.amount * 0.02))}</td>
                  <td className="p-4"><a className="inline-flex items-center gap-1 font-mono text-xs text-teal hover:underline" href="#">{shortHash(d.txHash)} <ExternalLink className="h-3 w-3" /></a></td>
                  <td className="p-4 text-right text-xs text-muted-foreground">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

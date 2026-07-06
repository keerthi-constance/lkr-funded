import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Ban, Save } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { categories as initialCategories, universities } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [commission, setCommission] = useState(2);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState("");
  const [unis, setUnis] = useState(universities.map((u) => ({ ...u, suspended: false })));
  const [banner, setBanner] = useState("Applications for the 2026 research funding cycle are now open!");

  return (
    <DashboardShell role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Global configuration for FundEd.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Commission Rate</h3>
            <div className="mt-3 flex items-center gap-3">
              <Input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="w-24" />
              <span className="text-sm text-muted-foreground">% platform fee on every donation & release</span>
            </div>
            <Button size="sm" className="mt-4 bg-teal-gradient text-navy-deep" onClick={() => toast.success(`Commission set to ${commission}%`)}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Category List</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  {c}
                  <button onClick={() => setCategories((cs) => cs.filter((x) => x !== c))}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Add category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-9" />
              <Button size="sm" onClick={() => { if (!newCategory.trim()) return; setCategories((c) => [...c, newCategory.trim()]); setNewCategory(""); }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">University Accounts</h3>
          <div className="mt-3 divide-y divide-border">
            {unis.map((u) => (
              <div key={u.short} className="flex items-center gap-4 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-xs font-bold text-teal">{u.logo}</div>
                <div className="flex-1 text-sm font-medium">{u.name}</div>
                <Badge className={u.suspended ? "bg-destructive/15 text-destructive" : "bg-teal/15 text-teal"}>{u.suspended ? "Suspended" : "Active"}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUnis((list) => list.map((x) => (x.short === u.short ? { ...x, suspended: !x.suspended } : x)));
                    toast.success(u.suspended ? "University reinstated." : "University suspended.");
                  }}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" /> {u.suspended ? "Reinstate" : "Suspend"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Site-wide Announcement Banner</h3>
          <Textarea rows={2} className="mt-3" value={banner} onChange={(e) => setBanner(e.target.value)} />
          <Button size="sm" className="mt-3 bg-teal-gradient text-navy-deep" onClick={() => toast.success("Announcement banner updated.")}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Publish Banner
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

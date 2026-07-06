import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Users, TrendingUp, Award } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { projects } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/university/analytics")({
  component: UniProfile,
});

const trend = Array.from({ length: 6 }, (_, i) => ({
  month: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"][i],
  students: 40 + i * 12 + Math.round(Math.random() * 8),
}));

function UniProfile() {
  const [departments, setDepartments] = useState(["Biomedical Engineering", "Computer Science", "Mechanical Engineering", "Marine Sciences"]);
  const [newDept, setNewDept] = useState("");
  const topProjects = [...projects].sort((a, b) => b.raised - a.raised).slice(0, 3);

  return (
    <DashboardShell role="university">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">University Profile & Analytics</h1>
          <p className="text-muted-foreground">Branding, departments, and funding performance.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Branding</h3>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-navy text-lg font-bold text-teal">UOC</div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Logo updated (mock).")}>
                <Building2 className="mr-1.5 h-3.5 w-3.5" /> Upload logo
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <h3 className="font-display font-semibold">Departments</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {departments.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  {d}
                  <button onClick={() => setDepartments((ds) => ds.filter((x) => x !== d))}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Add department..." value={newDept} onChange={(e) => setNewDept(e.target.value)} className="h-9" />
              <Button
                size="sm"
                onClick={() => {
                  if (!newDept.trim()) return;
                  setDepartments((d) => [...d, newDept.trim()]);
                  setNewDept("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Students Onboarded" value="214" hint="+18 this month" icon={Users} />
          <StatCard label="Funding Success Rate" value="76%" hint="Projects fully funded" icon={TrendingUp} accent="gold" />
          <StatCard label="Top Category" value="AI & ML" hint="By funds raised" icon={Award} accent="navy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <h3 className="font-display font-semibold">Students onboarded over time</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="students" fill="#14E0C4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Top-performing projects</h3>
            <div className="mt-3 space-y-3">
              {topProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <img src={p.cover} className="h-10 w-14 rounded-lg object-cover" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.donors} donors</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

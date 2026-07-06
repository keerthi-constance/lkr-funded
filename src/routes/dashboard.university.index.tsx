import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { CheckCircle2, Coins, Users, TrendingUp } from "lucide-react";
import { platformStats, formatRs, projects } from "@/lib/mock-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/dashboard/university/")({
  component: UniHome,
});

const timeSeries = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  raised: Math.round(1500000 + Math.sin(i) * 400000 + i * 200000),
}));

const byCategory = [
  { name: "Biotech", value: 32 },
  { name: "AI/ML", value: 28 },
  { name: "Energy", value: 18 },
  { name: "Robotics", value: 12 },
  { name: "Other", value: 10 },
];
const COLORS = ["#14E0C4", "#F2B84B", "#4A6FE0", "#B784F0", "#F0846B"];

function UniHome() {
  return (
    <DashboardShell role="university">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">University of Colombo</h1>
          <p className="text-muted-foreground">Verification queue and funding oversight.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending Students" value="14" hint="Awaiting verification" icon={Users} accent="gold" />
          <StatCard label="Pending Projects" value="6" hint="Under review" icon={CheckCircle2} />
          <StatCard label="Milestones to Review" value="9" hint="Evidence submitted" icon={TrendingUp} accent="gold" />
          <StatCard label="Total Raised" value={formatRs(12480000)} hint="For your students" icon={Coins} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <h3 className="font-display font-semibold">Funding raised over time</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="raised" stroke="#14E0C4" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Projects by category</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold">Recent projects awaiting review</h3>
          <div className="divide-y divide-border">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-3">
                <img src={p.cover} alt="" className="h-14 w-20 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.student.name} · {p.student.department}</div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Reject</button>
                  <button className="rounded-md bg-teal-gradient px-3 py-1.5 text-xs font-semibold text-navy-deep">Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

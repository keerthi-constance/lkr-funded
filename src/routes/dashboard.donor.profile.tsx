import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Save } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/dashboard/donor/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [name, setName] = useState("Nishan Abeysekera");
  const [email, setEmail] = useState("nishan.a@example.com");
  const [prefs, setPrefs] = useState({ updates: true, milestones: true, marketing: false });

  return (
    <DashboardShell role="donor">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Donor Profile</h1>
          <p className="text-muted-foreground">Manage your account and notification preferences.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Profile Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</label>
              <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4 bg-teal-gradient text-navy-deep" onClick={() => toast.success("Profile updated.")}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Notification Preferences</h3>
          <div className="mt-4 space-y-3">
            {[
              { key: "updates" as const, label: "Project updates from students I've funded" },
              { key: "milestones" as const, label: "Milestone verification & fund release alerts" },
              { key: "marketing" as const, label: "New project recommendations & newsletters" },
            ].map((p) => (
              <label key={p.key} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                {p.label}
                <input
                  type="checkbox"
                  checked={prefs[p.key]}
                  onChange={(e) => setPrefs((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Donation History</h3>
          <p className="mt-1 text-sm text-muted-foreground">Download a summary of all your contributions for your records.</p>
          <Button variant="outline" className="mt-4" onClick={() => toast.success("Donation history PDF generated.")}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF Receipt
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

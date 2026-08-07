import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlatformWallet } from "@/components/platform-wallet";

export const Route = createFileRoute("/dashboard/donor/wallet")({
  component: WalletPage,
});

function WalletPage() {
  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Top up tADA to donate faster, and withdraw anytime — every transaction is recorded on Cardano.</p>
        </div>
        <PlatformWallet />
      </div>
    </DashboardShell>
  );
}

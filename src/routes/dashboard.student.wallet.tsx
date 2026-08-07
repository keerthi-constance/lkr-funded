import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlatformWallet } from "@/components/platform-wallet";

export const Route = createFileRoute("/dashboard/student/wallet")({
  component: WalletPage,
});

function WalletPage() {
  return (
    <DashboardShell role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Deposit, withdraw, and track milestone payouts — every transaction is recorded on Cardano.</p>
        </div>
        <PlatformWallet />
      </div>
    </DashboardShell>
  );
}

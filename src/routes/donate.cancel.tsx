import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/donate/cancel")({
  head: () => ({ meta: [{ title: "Donation cancelled — FundEd" }] }),
  component: DonateCancel,
});

function DonateCancel() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Checkout cancelled</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing was charged. You can head back and try again whenever you're ready.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/browse">Back to projects</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

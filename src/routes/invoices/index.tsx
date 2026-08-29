import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/components/InvoiceList";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [{ title: "Invoices — Local Ledger" }],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage, track, and issue offline invoices stored locally on your device.
          </p>
        </div>
        <Button asChild className="gap-1.5 shadow-sm">
          <Link to="/invoices/new">
            <span className="text-base leading-none">+</span>
            New invoice
          </Link>
        </Button>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <InvoiceList />
      </ClientOnly>
    </div>
  );
}

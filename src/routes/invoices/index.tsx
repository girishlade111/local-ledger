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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Invoices</h1>
          <p className="mt-2 text-sm text-muted-foreground">All invoices stored on this device.</p>
        </div>
        <Button asChild>
          <Link to="/invoices/new">New invoice</Link>
        </Button>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <InvoiceList />
      </ClientOnly>
    </div>
  );
}

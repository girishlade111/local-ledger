import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { InvoiceForm } from "@/components/InvoiceForm";

export const Route = createFileRoute("/invoices/new")({
  head: () => ({
    meta: [{ title: "New invoice — Local Ledger" }],
  }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground">
        ← All invoices
      </Link>
      <h1 className="mt-4 mb-8 font-display text-3xl tracking-tight">New invoice</h1>
      <ClientOnly fallback={null}>
        <InvoiceForm />
      </ClientOnly>
    </div>
  );
}

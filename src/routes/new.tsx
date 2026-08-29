import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { InvoiceForm } from "@/components/InvoiceForm";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New invoice — local-invoice" },
      {
        name: "description",
        content: "Draft a new invoice with line items and export it to PDF, entirely offline.",
      },
      { property: "og:title", content: "New invoice — local-invoice" },
      {
        property: "og:description",
        content: "Draft a new invoice with line items and export it to PDF, entirely offline.",
      },
    ],
  }),
  component: NewInvoice,
});

function NewInvoice() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← All invoices
      </Link>
      <h1 className="mt-4 mb-8 font-display text-3xl tracking-tight">New invoice</h1>
      <ClientOnly fallback={null}>
        <InvoiceForm />
      </ClientOnly>
    </main>
  );
}

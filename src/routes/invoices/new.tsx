import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { InvoiceForm } from "@/components/InvoiceForm";

export const Route = createFileRoute("/invoices/new")({
  head: () => ({
    meta: [
      { title: "New Invoice — Local Ledger" },
      { name: "description", content: "Create and issue a new offline invoice." },
    ],
  }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to invoices
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          New Invoice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft a new invoice for services, products, or consulting.
        </p>
      </header>

      <ClientOnly
        fallback={
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Initializing invoice editor…</p>
            </div>
          </div>
        }
      >
        <InvoiceForm />
      </ClientOnly>
    </div>
  );
}

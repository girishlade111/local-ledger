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

function InvoiceFormSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-4">
          <div className="h-6 w-44 rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded bg-muted/60 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded bg-muted/50 animate-pulse" />
            <div className="h-10 rounded bg-muted/50 animate-pulse" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-4">
          <div className="h-6 w-36 rounded bg-muted animate-pulse" />
          <div className="h-12 w-full rounded bg-muted/40 animate-pulse" />
        </div>
      </div>
      <div className="space-y-6 lg:col-span-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-4">
          <div className="h-6 w-36 rounded bg-muted animate-pulse" />
          <div className="h-32 w-full rounded bg-muted/40 animate-pulse" />
          <div className="h-11 w-full rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

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

      <ClientOnly fallback={<InvoiceFormSkeleton />}>
        <InvoiceForm />
      </ClientOnly>
    </div>
  );
}

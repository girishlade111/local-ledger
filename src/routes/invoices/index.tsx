import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/components/InvoiceList";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — Local Ledger" },
      { name: "description", content: "Manage, track, and issue offline invoices stored locally on your device." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="h-10 w-64 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-10 w-48 rounded-lg bg-muted/50 animate-pulse" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-paper">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted/60 animate-pulse rounded" />
            <div className="h-4 w-20 bg-muted/60 animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </header>

      <ClientOnly fallback={<InvoicesSkeleton />}>
        <InvoiceList />
      </ClientOnly>
    </div>
  );
}

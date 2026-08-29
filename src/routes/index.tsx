import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/components/InvoiceList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "local-invoice — Offline invoices in your browser" },
      {
        name: "description",
        content:
          "Create, store and export invoices as PDFs. Data lives only in your browser's IndexedDB — no backend, no accounts.",
      },
      { property: "og:title", content: "local-invoice — Offline invoices in your browser" },
      {
        property: "og:description",
        content: "Offline-first invoicing with PDF export. All data stays on your device.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">local-invoice</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Offline invoicing. Stored in IndexedDB on this device only.
          </p>
        </div>
        <Button asChild>
          <Link to="/new">New invoice</Link>
        </Button>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <InvoiceList />
      </ClientOnly>
    </main>
  );
}

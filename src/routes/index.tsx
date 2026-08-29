import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { listFullInvoices } from "@/db/full-invoice";
import { listClients } from "@/db/clients";
import { invoiceTotal } from "@/types/invoice";
import { money, shortDate } from "@/utils/format";
import { useEffect, useState } from "react";
import type { FullInvoice } from "@/db/full-invoice";
import type { Client } from "@/types/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Local Ledger" },
      {
        name: "description",
        content: "Overview of your invoices and clients.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <DashboardContent />
    </ClientOnly>
  );
}

function DashboardContent() {
  const [invoices, setInvoices] = useState<FullInvoice[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);

  useEffect(() => {
    listFullInvoices().then(setInvoices);
    listClients().then(setClients);
  }, []);

  if (invoices === null || clients === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + invoiceTotal(i.items, i.taxRate || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + invoiceTotal(i.items, i.taxRate || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const recent = invoices.slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 font-display text-3xl tracking-tight">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-paper">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="mt-2 font-display text-2xl">{money(totalOutstanding)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-paper">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid</p>
          <p className="mt-2 font-display text-2xl">{money(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-paper">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</p>
          <p className="mt-2 font-display text-2xl">{overdueCount}</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Recent invoices</h2>
          <Button asChild variant="secondary" size="sm">
            <Link to="/invoices">View all</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Create your first invoice to get started."
            action={
              <Button asChild>
                <Link to="/invoices/new">New invoice</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {recent.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-paper"
              >
                <div className="min-w-40 flex-1">
                  <p className="font-display text-lg">
                    {invoice.client?.name || "Untitled client"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.invoiceNumber} · issued {shortDate(invoice.issueDate)}
                  </p>
                </div>
                <p className="font-display text-lg">
                  {money(invoiceTotal(invoice.items, invoice.taxRate || 0), invoice.currency)}
                </p>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/invoices/$id" params={{ id: invoice.id }}>
                    View
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Clients</h2>
          <Button asChild variant="secondary" size="sm">
            <Link to="/clients">View all</Link>
          </Button>
        </div>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add a client to start creating invoices."
            action={
              <Button asChild>
                <Link to="/clients">Add client</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {clients.slice(0, 5).map((client) => (
              <li
                key={client.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-paper"
              >
                <div className="min-w-40 flex-1">
                  <p className="font-display text-lg">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.email || "No email"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

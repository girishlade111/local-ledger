import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { deleteInvoice } from "@/db/invoices";
import { listFullInvoices, type FullInvoice } from "@/db/full-invoice";
import { invoiceTotal } from "@/types/invoice";
import { money, shortDate } from "@/utils/format";
import { downloadInvoicePdf } from "@/utils/pdf";

export function InvoiceList() {
  const [invoices, setInvoices] = useState<FullInvoice[] | null>(null);

  const refresh = () => listFullInvoices().then(setInvoices);
  useEffect(() => {
    refresh();
  }, []);

  if (invoices === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <h2 className="text-xl">No invoices yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you create stays in this browser — nothing is uploaded.
        </p>
        <Button asChild className="mt-5">
          <Link to="/new">Create your first invoice</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-paper"
        >
          <div className="min-w-40 flex-1">
            <p className="font-display text-lg">{invoice.client?.name || "Untitled client"}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.invoiceNumber} · issued {shortDate(invoice.issueDate)} · due{" "}
              {shortDate(invoice.dueDate)}
            </p>
          </div>
          <p className="font-display text-lg">{money(invoiceTotal(invoice.items))}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => downloadInvoicePdf(invoice)}>
              PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await deleteInvoice(invoice.id);
                refresh();
              }}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

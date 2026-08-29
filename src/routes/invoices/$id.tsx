import { useEffect, useState } from "react";
import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  Send,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { InvoiceForm } from "@/components/InvoiceForm";
import { StatusBadge, getEffectiveStatus } from "@/components/InvoiceList";
import { getFullInvoice, type FullInvoice } from "@/db/full-invoice";
import { deleteInvoice, duplicateInvoiceTransaction, updateInvoice } from "@/db/invoices";
import { getSettings } from "@/db/settings";
import type { InvoiceStatus } from "@/types/invoice";
import type { Settings } from "@/types/settings";
import { money, shortDate } from "@/utils/format";
import { downloadInvoicePdf } from "@/utils/pdf";

export const Route = createFileRoute("/invoices/$id")({
  head: () => ({
    meta: [
      { title: "Invoice Details — Local Ledger" },
      { name: "description", content: "View, print, edit, and download offline invoice PDF." },
    ],
  }),
  component: InvoiceDetailPage,
});

const statuses: Array<{
  value: InvoiceStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "draft", label: "Draft", icon: FileText },
  { value: "sent", label: "Sent", icon: Send },
  { value: "paid", label: "Paid", icon: CheckCircle2 },
  { value: "overdue", label: "Overdue", icon: Clock },
];

function InvoiceDetailPage() {
  const { id } = Route.useParams();

  return (
    <ClientOnly
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
          <p className="text-sm font-medium animate-pulse">Loading invoice…</p>
        </div>
      }
    >
      <InvoiceDetail id={id} />
    </ClientOnly>
  );
}

function InvoiceDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<FullInvoice | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const refresh = async () => {
    const [inv, s] = await Promise.all([getFullInvoice(id), getSettings()]);
    setInvoice(inv);
    setSettings(s);
  };

  useEffect(() => {
    getFullInvoice(id).then((inv) => setInvoice(inv));
    getSettings().then((s) => setSettings(s));
  }, [id]);

  if (invoice === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Reading local database…</p>
      </div>
    );
  }

  if (invoice === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <EmptyState
          title="Invoice not found"
          description="This invoice may have been deleted or the link is invalid."
          action={
            <Button asChild>
              <Link to="/invoices">Back to all invoices</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Edit Mode View
  if (isEditing) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Invoice View
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            Editing Invoice #{invoice.invoiceNumber}
          </span>
        </div>

        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Edit Invoice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update invoice items, client, payment terms, or rates.
          </p>
        </header>

        <InvoiceForm
          initialInvoiceId={invoice.id}
          initialData={invoice}
          onSuccess={() => {
            setIsEditing(false);
            refresh();
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const subtotal = invoice.items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0),
    0,
  );
  const taxRate = Number(invoice.taxRate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const currency = invoice.currency || "USD";
  const effectiveStatus = getEffectiveStatus(invoice);

  const handleStatusChange = async (status: InvoiceStatus) => {
    try {
      await updateInvoice(id, { status });
      toast.success(`Invoice status updated to ${status}`);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await duplicateInvoiceTransaction(id);
      toast.success(`Invoice duplicated as ${copy.invoiceNumber}!`);
      navigate({ to: "/invoices/$id", params: { id: copy.id } });
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate invoice");
      setDuplicating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(invoice, settings || undefined);
      toast.success(`PDF downloaded: ${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      return;
    }
    try {
      await deleteInvoice(id);
      toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      navigate({ to: "/invoices" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all invoices
        </Link>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>

          {/* Duplicate */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            {duplicating ? "Duplicating…" : "Duplicate"}
          </Button>

          {/* Print */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5 text-xs font-medium cursor-pointer hidden sm:inline-flex"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>

          {/* Download PDF */}
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingPdf ? "Generating PDF…" : "Download PDF"}
          </Button>

          {/* Delete */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Current Status:</span>
          <StatusBadge status={effectiveStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Mark as:</span>
          {statuses.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={invoice.status === s.value ? "default" : "outline"}
              onClick={() => handleStatusChange(s.value)}
              className="h-7 text-xs px-2.5 gap-1 cursor-pointer font-medium"
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clean Printable Paper Layout */}
      <article className="rounded-xl border border-border bg-card p-8 sm:p-12 shadow-paper print:border-0 print:shadow-none print:p-0 space-y-10">
        {/* Header: Business Branding & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-border/80 pb-8">
          {/* Business Branding */}
          <div className="flex items-start gap-4">
            {settings?.businessLogo ? (
              <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1 shadow-sm">
                <img
                  src={settings.businessLogo}
                  alt={settings.businessName || "Business Logo"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
            )}

            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {settings?.businessName || "Local Ledger"}
              </h2>
              {settings?.businessAddress ? (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {settings.businessAddress}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Offline Invoicing</p>
              )}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="text-left sm:text-right space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">INVOICE</h1>
            <p className="font-mono text-base font-semibold text-foreground">
              #{invoice.invoiceNumber}
            </p>
            <div className="pt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex sm:justify-end gap-2">
                <span>Issue Date:</span>
                <span className="font-medium text-foreground">{shortDate(invoice.issueDate)}</span>
              </div>
              <div className="flex sm:justify-end gap-2">
                <span>Due Date:</span>
                <span
                  className={
                    effectiveStatus === "overdue"
                      ? "font-semibold text-rose-600 dark:text-rose-400"
                      : "font-medium text-foreground"
                  }
                >
                  {shortDate(invoice.dueDate)}
                </span>
              </div>
              <div className="flex sm:justify-end gap-2">
                <span>Currency:</span>
                <span className="font-mono font-medium text-foreground">{currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To / Client Section */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-muted/20 p-5 space-y-2">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Billed To
            </span>
            <h3 className="font-display text-lg font-bold text-foreground">
              {invoice.client?.name || "Untitled Client"}
            </h3>

            {invoice.client?.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{invoice.client.email}</span>
              </div>
            )}

            {invoice.client?.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{invoice.client.phone}</span>
              </div>
            )}

            {invoice.client?.address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="whitespace-pre-line leading-relaxed">
                  {invoice.client.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right w-24">Qty</th>
                  <th className="py-3 px-4 text-right w-32">Rate</th>
                  <th className="py-3 px-4 text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoice.items.map((item, index) => {
                  const lineAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                  return (
                    <tr key={item.id || index} className="hover:bg-muted/10">
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {item.description || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-foreground">
                        {money(item.rate, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        {money(lineAmount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-80 space-y-2 text-sm rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-foreground">
                  {money(subtotal, currency)}
                </span>
              </div>

              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-mono font-medium text-foreground">
                    {money(taxAmount, currency)}
                  </span>
                </div>
              )}

              <div className="border-t-2 border-border pt-3 flex items-baseline justify-between">
                <span className="font-display text-base font-bold text-foreground">Total Due</span>
                <span className="font-display text-xl font-bold text-primary font-mono">
                  {money(total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Payment Terms */}
        {invoice.notes && (
          <div className="rounded-lg border border-border/80 bg-muted/10 p-5 space-y-1.5 border-t">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes & Payment Terms
            </h4>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
              {invoice.notes}
            </p>
          </div>
        )}
      </article>
    </div>
  );
}

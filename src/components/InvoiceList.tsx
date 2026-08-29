import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowUpDown,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { listFullInvoices, type FullInvoice } from "@/db/full-invoice";
import { deleteInvoice, duplicateInvoiceTransaction, updateInvoice } from "@/db/invoices";
import { invoiceTotal, type InvoiceStatus } from "@/types/invoice";
import { money, shortDate } from "@/utils/format";
import { downloadInvoicePdf } from "@/utils/pdf";

export type EffectiveStatus = "draft" | "sent" | "paid" | "overdue";

export function getEffectiveStatus(invoice: FullInvoice): EffectiveStatus {
  if (invoice.status === "paid") return "paid";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (invoice.dueDate && invoice.dueDate < todayStr) {
    return "overdue";
  }
  return invoice.status;
}

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Paid
        </span>
      );
    case "sent":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Sent
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Overdue
        </span>
      );
    case "draft":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          Draft
        </span>
      );
  }
}

type SortOption =
  "date_desc" | "date_asc" | "due_asc" | "amount_desc" | "amount_asc" | "number_desc";

export function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<FullInvoice[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const refresh = async () => {
    const list = await listFullInvoices();
    setInvoices(list);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Compute status counts & financial stats
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, sent: 0, overdue: 0, draft: 0, grandTotal: 0 };
    let paid = 0;
    let sent = 0;
    let overdue = 0;
    let draft = 0;
    let grandTotal = 0;

    invoices.forEach((inv) => {
      const eff = getEffectiveStatus(inv);
      const total = invoiceTotal(inv.items, inv.taxRate || 0);
      grandTotal += total;
      if (eff === "paid") paid += 1;
      else if (eff === "sent") sent += 1;
      else if (eff === "overdue") overdue += 1;
      else if (eff === "draft") draft += 1;
    });

    return {
      total: invoices.length,
      paid,
      sent,
      overdue,
      draft,
      grandTotal,
    };
  }, [invoices]);

  // Filtering and Sorting
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    return invoices
      .filter((inv) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
          const matchClient = inv.client?.name?.toLowerCase().includes(q);
          const matchEmail = inv.client?.email?.toLowerCase().includes(q);
          if (!matchNumber && !matchClient && !matchEmail) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          const eff = getEffectiveStatus(inv);
          if (eff !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const totalA = invoiceTotal(a.items, a.taxRate || 0);
        const totalB = invoiceTotal(b.items, b.taxRate || 0);

        switch (sortBy) {
          case "date_desc":
            return (
              new Date(b.issueDate || b.createdAt).getTime() -
              new Date(a.issueDate || a.createdAt).getTime()
            );
          case "date_asc":
            return (
              new Date(a.issueDate || a.createdAt).getTime() -
              new Date(b.issueDate || b.createdAt).getTime()
            );
          case "due_asc":
            return (
              new Date(a.dueDate || "9999-12-31").getTime() -
              new Date(b.dueDate || "9999-12-31").getTime()
            );
          case "amount_desc":
            return totalB - totalA;
          case "amount_asc":
            return totalA - totalB;
          case "number_desc":
            return b.invoiceNumber.localeCompare(a.invoiceNumber);
          default:
            return 0;
        }
      });
  }, [invoices, searchQuery, statusFilter, sortBy]);

  // Quick Action Handlers
  const handleMarkStatus = async (id: string, status: InvoiceStatus, invoiceNumber: string) => {
    setActionLoadingId(id);
    try {
      await updateInvoice(id, { status });
      toast.success(`Invoice ${invoiceNumber} marked as ${status}`);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: string, invoiceNumber: string) => {
    setActionLoadingId(id);
    try {
      const copy = await duplicateInvoiceTransaction(id);
      toast.success(`Invoice ${invoiceNumber} duplicated as ${copy.invoiceNumber}!`);
      await refresh();
      navigate({ to: "/invoices/$id", params: { id: copy.id } });
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate invoice");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      await deleteInvoice(id);
      toast.success(`Invoice ${invoiceNumber} deleted`);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (invoices === null) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/40">
        <p className="text-sm text-muted-foreground animate-pulse">Reading local database…</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Create and issue your first offline invoice to start tracking payments."
        action={
          <Button asChild className="gap-2 shadow-sm font-medium">
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, email, or invoice #…"
            className="pl-9 pr-8 bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters & Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-card text-xs h-9">
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({stats.total})</SelectItem>
              <SelectItem value="paid">Paid ({stats.paid})</SelectItem>
              <SelectItem value="sent">Sent ({stats.sent})</SelectItem>
              <SelectItem value="overdue">Overdue ({stats.overdue})</SelectItem>
              <SelectItem value="draft">Draft ({stats.draft})</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Select */}
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
            <SelectTrigger className="w-[160px] bg-card text-xs h-9">
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Issue Date (Newest)</SelectItem>
              <SelectItem value="date_asc">Issue Date (Oldest)</SelectItem>
              <SelectItem value="due_asc">Due Date (Earliest)</SelectItem>
              <SelectItem value="amount_desc">Amount (Highest)</SelectItem>
              <SelectItem value="amount_asc">Amount (Lowest)</SelectItem>
              <SelectItem value="number_desc">Invoice # (Desc)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Status Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3 text-xs">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-full px-3 py-1 font-medium transition-colors cursor-pointer ${
            statusFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          All <span className="ml-1 opacity-80">{stats.total}</span>
        </button>
        <button
          onClick={() => setStatusFilter("paid")}
          className={`rounded-full px-3 py-1 font-medium transition-colors cursor-pointer ${
            statusFilter === "paid"
              ? "bg-emerald-600 text-white"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          Paid <span className="ml-1 opacity-80">{stats.paid}</span>
        </button>
        <button
          onClick={() => setStatusFilter("sent")}
          className={`rounded-full px-3 py-1 font-medium transition-colors cursor-pointer ${
            statusFilter === "sent"
              ? "bg-blue-600 text-white"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
          }`}
        >
          Sent <span className="ml-1 opacity-80">{stats.sent}</span>
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={`rounded-full px-3 py-1 font-medium transition-colors cursor-pointer ${
            statusFilter === "overdue"
              ? "bg-rose-600 text-white"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
          }`}
        >
          Overdue <span className="ml-1 opacity-80">{stats.overdue}</span>
        </button>
        <button
          onClick={() => setStatusFilter("draft")}
          className={`rounded-full px-3 py-1 font-medium transition-colors cursor-pointer ${
            statusFilter === "draft"
              ? "bg-foreground text-background"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          Draft <span className="ml-1 opacity-80">{stats.draft}</span>
        </button>
      </div>

      {/* Invoices Table / List */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="font-display text-base font-medium text-foreground">No matching invoices</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Try adjusting your search query or status filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 hidden md:table-cell">Issue Date</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInvoices.map((invoice) => {
                  const effectiveStatus = getEffectiveStatus(invoice);
                  const totalAmount = invoiceTotal(invoice.items, invoice.taxRate || 0);

                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => navigate({ to: "/invoices/$id", params: { id: invoice.id } })}
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      {/* Invoice # */}
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-primary">
                        <Link
                          to="/invoices/$id"
                          params={{ id: invoice.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>

                      {/* Client Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-display font-medium text-foreground">
                          {invoice.client?.name || "Untitled Client"}
                        </div>
                        {invoice.client?.email && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {invoice.client.email}
                          </div>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {shortDate(invoice.issueDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-xs hidden sm:table-cell whitespace-nowrap">
                        <span
                          className={
                            effectiveStatus === "overdue"
                              ? "font-semibold text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }
                        >
                          {shortDate(invoice.dueDate)}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {money(totalAmount, invoice.currency)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={effectiveStatus} />
                      </td>

                      {/* Actions Dropdown */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => downloadInvoicePdf(invoice)}
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                disabled={actionLoadingId === invoice.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">
                                {invoice.invoiceNumber}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() =>
                                  navigate({ to: "/invoices/$id", params: { id: invoice.id } })
                                }
                                className="cursor-pointer gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => downloadInvoicePdf(invoice)}
                                className="cursor-pointer gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleDuplicate(invoice.id, invoice.invoiceNumber)}
                                className="cursor-pointer gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Duplicate Invoice
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                                Change Status
                              </DropdownMenuLabel>

                              {invoice.status !== "paid" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleMarkStatus(invoice.id, "paid", invoice.invoiceNumber)
                                  }
                                  className="cursor-pointer gap-2 text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}

                              {invoice.status !== "sent" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleMarkStatus(invoice.id, "sent", invoice.invoiceNumber)
                                  }
                                  className="cursor-pointer gap-2 text-blue-600 dark:text-blue-400 font-medium"
                                >
                                  <Send className="h-4 w-4" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              )}

                              {invoice.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleMarkStatus(invoice.id, "draft", invoice.invoiceNumber)
                                  }
                                  className="cursor-pointer gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Mark as Draft
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary bar */}
          <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </span>
            <span className="font-mono font-medium text-foreground">
              Total: {money(stats.grandTotal, invoices[0]?.currency || "USD")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

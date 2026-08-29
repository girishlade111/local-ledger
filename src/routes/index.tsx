import { useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { differenceInDays, format, formatDistanceToNow, parseISO, subMonths } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  DownloadCloud,
  FileText,
  Plus,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, getEffectiveStatus } from "@/components/InvoiceList";
import { listClients } from "@/db/clients";
import { listFullInvoices, type FullInvoice } from "@/db/full-invoice";
import { getSettings } from "@/db/settings";
import { exportDatabaseBackup } from "@/utils/backup";
import { invoiceTotal } from "@/types/invoice";
import type { Client } from "@/types/client";
import type { Settings } from "@/types/settings";
import { money, shortDate } from "@/utils/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Local Ledger" },
      {
        name: "description",
        content: "Overview of your offline invoices, revenue, and clients.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
          <p className="text-sm font-medium animate-pulse">Loading dashboard overview…</p>
        </div>
      }
    >
      <DashboardContent />
    </ClientOnly>
  );
}

function DashboardContent() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<FullInvoice[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [quickExporting, setQuickExporting] = useState(false);

  const refresh = async () => {
    const [invList, clientList, appSettings] = await Promise.all([
      listFullInvoices(),
      listClients(),
      getSettings(),
    ]);
    setInvoices(invList);
    setClients(clientList);
    setSettings(appSettings);
  };

  useEffect(() => {
    refresh();
  }, []);

  const currency = settings?.defaultCurrency || "USD";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentMonthKey = format(new Date(), "yyyy-MM");

  // Summary Metrics Computation
  const summary = useMemo(() => {
    if (!invoices || !clients) {
      return {
        totalOutstanding: 0,
        unpaidCount: 0,
        paidThisMonth: 0,
        paidThisMonthCount: 0,
        overdueCount: 0,
        overdueTotal: 0,
        totalClients: 0,
        totalRevenue: 0,
      };
    }

    let totalOutstanding = 0;
    let unpaidCount = 0;
    let paidThisMonth = 0;
    let paidThisMonthCount = 0;
    let overdueCount = 0;
    let overdueTotal = 0;
    let totalRevenue = 0;

    invoices.forEach((inv) => {
      const total = invoiceTotal(inv.items, inv.taxRate || 0);
      const effective = getEffectiveStatus(inv);

      if (effective === "paid") {
        totalRevenue += total;
        // Check if paid/issued this month
        const dateKey = (inv.issueDate || inv.createdAt || "").slice(0, 7);
        if (dateKey === currentMonthKey) {
          paidThisMonth += total;
          paidThisMonthCount += 1;
        }
      } else {
        totalOutstanding += total;
        unpaidCount += 1;

        if (effective === "overdue") {
          overdueCount += 1;
          overdueTotal += total;
        }
      }
    });

    return {
      totalOutstanding,
      unpaidCount,
      paidThisMonth,
      paidThisMonthCount,
      overdueCount,
      overdueTotal,
      totalClients: clients.length,
      totalRevenue,
    };
  }, [invoices, clients, currentMonthKey]);

  // Last 6 Months Chart Series Computation
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        monthKey: format(d, "yyyy-MM"),
        name: format(d, "MMM"),
        fullName: format(d, "MMMM yyyy"),
        invoiced: 0,
        paid: 0,
        count: 0,
      };
    });

    if (!invoices) return months;

    invoices.forEach((inv) => {
      const total = invoiceTotal(inv.items, inv.taxRate || 0);
      const dateKey = (inv.issueDate || inv.createdAt || "").slice(0, 7);
      const match = months.find((m) => m.monthKey === dateKey);
      if (match) {
        match.invoiced += total;
        match.count += 1;
        if (inv.status === "paid") {
          match.paid += total;
        }
      }
    });

    return months;
  }, [invoices]);

  // Backup Reminder Calculation: Show if no backup taken in 30+ days or never taken with active data
  const daysSinceLastBackup = useMemo(() => {
    if (!settings?.lastBackupDate) return null;
    try {
      return differenceInDays(new Date(), parseISO(settings.lastBackupDate));
    } catch {
      return null;
    }
  }, [settings]);

  const shouldShowBackupReminder = useMemo(() => {
    const hasData = (invoices && invoices.length > 0) || (clients && clients.length > 0);
    if (!hasData) return false;
    if (daysSinceLastBackup === null) return true; // never backed up
    return daysSinceLastBackup >= 30;
  }, [daysSinceLastBackup, invoices, clients]);

  const handleQuickExportBackup = async () => {
    setQuickExporting(true);
    try {
      const { summary } = await exportDatabaseBackup();
      toast.success(
        `Backup downloaded (${summary.invoicesCount} invoices, ${summary.clientsCount} clients)!`,
      );
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to export backup.");
    } finally {
      setQuickExporting(false);
    }
  };

  if (invoices === null || clients === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        <p className="text-sm font-medium animate-pulse">Reading local database…</p>
      </div>
    );
  }

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Inline Client Creation Modal */}
      <CreateClientDialog
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onClientCreated={() => {
          refresh();
        }}
      />

      {/* Header with Greeting & Quick Action Buttons */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Overview of your offline revenue, active invoices, and clients.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setNewClientOpen(true)}
            className="gap-1.5 shadow-sm text-xs font-medium cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />+ New Client
          </Button>

          <Button asChild className="gap-1.5 shadow-sm text-xs font-medium cursor-pointer">
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" />+ New Invoice
            </Link>
          </Button>
        </div>
      </header>

      {/* Backup Reminder Banner (Shows if no backup taken in 30+ days or never taken) */}
      {shouldShowBackupReminder && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display text-sm font-semibold text-amber-950 dark:text-amber-200">
                  Data Backup Reminder
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  {settings?.lastBackupDate ? (
                    <>
                      Your last backup was exported{" "}
                      <strong>
                        {formatDistanceToNow(parseISO(settings.lastBackupDate), {
                          addSuffix: true,
                        })}
                      </strong>
                      . Since all data is stored offline on this device, export a backup regularly
                      to prevent data loss.
                    </>
                  ) : (
                    <>
                      You haven't exported an offline database backup yet. Since Local Ledger
                      operates entirely on this device, download a JSON backup to protect against
                      browser cache clearing.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                size="sm"
                onClick={handleQuickExportBackup}
                disabled={quickExporting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 h-8 cursor-pointer shadow-xs"
              >
                <DownloadCloud className="h-3.5 w-3.5" />
                {quickExporting ? "Exporting…" : "Export Backup Now"}
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-xs h-8 text-amber-900 dark:text-amber-200"
              >
                <Link to="/settings">Settings</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Outstanding */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-paper transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Outstanding
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {money(summary.totalOutstanding, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.unpaidCount} unpaid invoice{summary.unpaidCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Card 2: Paid This Month */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-paper transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paid This Month
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {money(summary.paidThisMonth, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(), "MMMM yyyy")} ({summary.paidThisMonthCount} paid)
            </p>
          </div>
        </div>

        {/* Card 3: Overdue Count */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-paper transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overdue Invoices
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {summary.overdueCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.overdueTotal > 0
                ? `${money(summary.overdueTotal, currency)} past due`
                : "All accounts up to date"}
            </p>
          </div>
        </div>

        {/* Card 4: Total Clients */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-paper transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Clients
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {summary.totalClients}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link to="/clients" className="hover:underline text-primary">
                Manage client contacts →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section: Revenue by Month (Last 6 Months) */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-paper">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Revenue Trend
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly invoiced and paid totals over the last 6 months.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-primary/80" />
              <span className="text-muted-foreground">Invoiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Paid</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="oklch(0.89 0.018 80 / 0.4)"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={{ fill: "oklch(0.52 0.025 70)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "oklch(0.52 0.025 70)" }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0 && payload[0]?.payload) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs space-y-1.5">
                        <p className="font-semibold text-foreground">{data.fullName}</p>
                        <div className="flex items-center justify-between gap-4 text-muted-foreground">
                          <span>Invoiced:</span>
                          <span className="font-mono font-medium text-foreground">
                            {money(data.invoiced, currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                          <span>Paid:</span>
                          <span className="font-mono font-medium">
                            {money(data.paid, currency)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          {data.count} invoice{data.count === 1 ? "" : "s"} issued
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="invoiced"
                fill="oklch(0.42 0.11 155)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="paid"
                fill="oklch(0.6 0.16 155)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Invoices Section (Last 5) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
              Recent Invoices
            </h2>
            <p className="text-xs text-muted-foreground">Last 5 invoices issued on this device.</p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-xs font-medium text-primary"
          >
            <Link to="/invoices">
              View all invoices
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recentInvoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Create your first invoice to begin tracking revenue."
            action={
              <Button asChild className="gap-1.5">
                <Link to="/invoices/new">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Link>
              </Button>
            }
          />
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
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentInvoices.map((inv) => {
                    const effective = getEffectiveStatus(inv);
                    const total = invoiceTotal(inv.items, inv.taxRate || 0);

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}
                        className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-primary">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-display font-medium text-foreground">
                            {inv.client?.name || "Untitled Client"}
                          </p>
                          {inv.client?.email && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {inv.client.email}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {shortDate(inv.issueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-xs hidden sm:table-cell whitespace-nowrap">
                          <span
                            className={
                              effective === "overdue"
                                ? "font-semibold text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                            }
                          >
                            {shortDate(inv.dueDate)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                          {money(total, inv.currency || currency)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <StatusBadge status={effective} />
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2.5">
                            <Link to="/invoices/$id" params={{ id: inv.id }}>
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

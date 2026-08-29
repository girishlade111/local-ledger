import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Crown,
  FileDigit,
  FileText,
  Loader2,
  Percent,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { listClients } from "@/db/clients";
import {
  createInvoiceTransaction,
  nextInvoiceNumber,
  updateInvoiceTransaction,
} from "@/db/invoices";
import { getFullInvoice, type FullInvoice } from "@/db/full-invoice";
import { getSettings } from "@/db/settings";
import { CURRENCIES, getCurrencyByCode } from "@/utils/currencies";
import type { Client } from "@/types/client";
import type { InvoiceStatus } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import type { Settings } from "@/types/settings";

const today = () => format(new Date(), "yyyy-MM-dd");

type DraftItem = Omit<InvoiceItem, "id" | "invoiceId"> & { id: string };

const emptyItem = (): DraftItem => ({
  id: uuid(),
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
});

export interface InvoiceFormProps {
  initialInvoiceId?: string;
  initialData?: FullInvoice;
  onSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
}

export function InvoiceForm({
  initialInvoiceId,
  initialData,
  onSuccess,
  onCancel,
}: InvoiceFormProps = {}) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(initialData?.clientId || "");
  const [createClientOpen, setCreateClientOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || "");
  const [issueDate, setIssueDate] = useState(initialData?.issueDate || today());
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate || format(addDays(new Date(), 14), "yyyy-MM-dd"),
  );
  const [currency, setCurrency] = useState(initialData?.currency || "USD");
  const [taxRate, setTaxRate] = useState<number>(initialData?.taxRate ?? 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [items, setItems] = useState<DraftItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items.map((i) => ({ ...i, id: i.id || uuid() }))
      : [emptyItem()],
  );
  const [savingStatus, setSavingStatus] = useState<InvoiceStatus | null>(null);
  const isEditing = Boolean(initialInvoiceId || initialData);

  // Load settings & clients (and existing invoice if needed) on mount
  useEffect(() => {
    Promise.all([
      getSettings(),
      listClients(),
      initialInvoiceId && !initialData ? getFullInvoice(initialInvoiceId) : Promise.resolve(null),
    ]).then(([s, cList, existingInv]) => {
      setSettings(s);
      setClients(cList);

      if (existingInv) {
        setSelectedClientId(existingInv.clientId || "");
        setInvoiceNumber(existingInv.invoiceNumber || "");
        setIssueDate(existingInv.issueDate || today());
        setDueDate(existingInv.dueDate || format(addDays(new Date(), 14), "yyyy-MM-dd"));
        setCurrency(existingInv.currency || s.defaultCurrency || "USD");
        setTaxRate(existingInv.taxRate ?? 0);
        setNotes(existingInv.notes || "");
        if (existingInv.items && existingInv.items.length > 0) {
          setItems(existingInv.items.map((i) => ({ ...i, id: i.id || uuid() })));
        }
      } else if (!isEditing) {
        setCurrency(s.defaultCurrency || "USD");
        setTaxRate(s.taxRate || 0);
        nextInvoiceNumber(s.invoicePrefix, s.nextInvoiceNumber).then(setInvoiceNumber);
      }
    });
  }, [initialInvoiceId, initialData, isEditing]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleClientCreated = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
    setSelectedClientId(newClient.id);
  };

  const patchItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const quantity = patch.quantity !== undefined ? patch.quantity : item.quantity;
        const rate = patch.rate !== undefined ? patch.rate : item.rate;
        const amount = (Number(quantity) || 0) * (Number(rate) || 0);
        return {
          ...item,
          ...patch,
          quantity,
          rate,
          amount,
        };
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      setItems([emptyItem()]);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Quick payment term presets
  const applyDuePreset = (days: number) => {
    try {
      const base = parseISO(issueDate);
      setDueDate(format(addDays(base, days), "yyyy-MM-dd"));
    } catch {
      setDueDate(format(addDays(new Date(), days), "yyyy-MM-dd"));
    }
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0,
  );
  const effectiveTaxRate = Number(taxRate) || 0;
  const taxAmount = subtotal * (effectiveTaxRate / 100);
  const total = subtotal + taxAmount;

  const activeCurrency = getCurrencyByCode(currency);

  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: activeCurrency.code,
      }).format(amount || 0);
    } catch {
      return `${activeCurrency.symbol}${amount.toFixed(2)}`;
    }
  };

  const handleSave = async (status: InvoiceStatus) => {
    if (!selectedClientId) {
      toast.error("Please select or add a client for this invoice.");
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error("Please enter a valid invoice number.");
      return;
    }

    // Validate at least one item has description or amount
    const validItems = items.filter((i) => i.description.trim() || i.rate > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with a description or rate.");
      return;
    }

    setSavingStatus(status);
    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        clientId: selectedClientId,
        status,
        issueDate,
        dueDate,
        currency: activeCurrency.code,
        taxRate: effectiveTaxRate,
        notes: notes.trim(),
        items: items.map((i) => ({
          description: i.description.trim() || "Item",
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
        })),
      };

      if (isEditing && (initialInvoiceId || initialData?.id)) {
        const idToUpdate = initialInvoiceId || initialData!.id;
        const updated = await updateInvoiceTransaction({
          id: idToUpdate,
          ...payload,
        });

        toast.success(`Invoice ${updated.invoiceNumber} updated successfully!`);
        if (onSuccess) {
          onSuccess(updated.id);
        } else {
          navigate({ to: `/invoices/$id`, params: { id: updated.id } });
        }
      } else {
        const invoice = await createInvoiceTransaction(payload);

        toast.success(
          status === "draft"
            ? `Invoice ${invoice.invoiceNumber} saved as draft!`
            : `Invoice ${invoice.invoiceNumber} finalized and created!`,
        );

        if (onSuccess) {
          onSuccess(invoice.id);
        } else {
          navigate({ to: `/invoices/$id`, params: { id: invoice.id } });
        }
      }
    } catch (err) {
      console.error("Failed to save invoice:", err);
      toast.error("Failed to save invoice to database.");
      setSavingStatus(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Client Inline Creation Modal */}
      <CreateClientDialog
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onClientCreated={handleClientCreated}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left / Main Section: Form Fields */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Client & Invoice Metadata */}
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    Client & Invoice Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select the recipient and specify invoice numbers and dates.
                  </p>
                </div>
              </div>
            </div>

            {/* Client Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="client-select" className="text-sm font-medium">
                  Client <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateClientOpen(true)}
                  className="h-7 text-xs text-primary hover:text-primary/90 gap-1 px-2 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add new client
                </Button>
              </div>

              <div className="flex gap-2">
                <Select
                  value={selectedClientId}
                  onValueChange={(val) => {
                    if (val === "__new_client__") {
                      setCreateClientOpen(true);
                    } else {
                      setSelectedClientId(val);
                    }
                  }}
                >
                  <SelectTrigger id="client-select" className="bg-background/80 flex-1">
                    <SelectValue placeholder="Select an existing client…">
                      {selectedClient ? (
                        <span className="font-medium text-foreground">
                          {selectedClient.name}
                          {selectedClient.email && (
                            <span className="text-muted-foreground ml-2 font-normal text-xs">
                              ({selectedClient.email})
                            </span>
                          )}
                        </span>
                      ) : (
                        "Select an existing client…"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectGroup>
                      <SelectItem
                        value="__new_client__"
                        className="font-medium text-primary cursor-pointer border-b border-border/50 pb-2 mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>+ Add new client</span>
                        </div>
                      </SelectItem>
                      <SelectLabel>Existing Clients</SelectLabel>
                      {clients.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                          No clients saved yet. Select "+ Add new client" above.
                        </div>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id} className="cursor-pointer">
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-foreground">{client.name}</span>
                              {client.email && (
                                <span className="text-xs text-muted-foreground">
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setCreateClientOpen(true)}
                  className="gap-1.5 shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Client</span>
                </Button>
              </div>

              {/* Selected Client Card Preview */}
              {selectedClient && (
                <div className="mt-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">{selectedClient.name}</p>
                    {selectedClient.email && (
                      <p className="text-muted-foreground">{selectedClient.email}</p>
                    )}
                    {selectedClient.address && (
                      <p className="text-muted-foreground whitespace-pre-line">
                        {selectedClient.address}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
                    onClick={() => setSelectedClientId("")}
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>

            {/* Invoice Number, Currency, Dates */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {/* Invoice Number */}
              <div className="space-y-2">
                <Label htmlFor="invoice-number" className="text-sm font-medium">
                  Invoice Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="invoice-number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-0001"
                    className="bg-background/80 font-mono text-sm pr-8"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <FileDigit className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-generated from your settings numbering sequence.
                </p>
              </div>

              {/* Currency (Multi-Currency is a PRO feature) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="invoice-currency" className="text-sm font-medium">
                    Currency
                  </Label>
                  {!settings?.isPro && (
                    <Link
                      to="/pro"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <Crown className="h-3 w-3" />
                      PRO Multi-Currency
                    </Link>
                  )}
                </div>
                <Select
                  value={currency}
                  onValueChange={(val) => {
                    const defaultCurr = settings?.defaultCurrency || "USD";
                    if (!settings?.isPro && val !== defaultCurr) {
                      toast.error(
                        "Multi-currency per invoice is a PRO feature. Upgrade to PRO to unlock 25+ currencies.",
                        {
                          action: {
                            label: "Upgrade",
                            onClick: () => navigate({ to: "/pro" }),
                          },
                        },
                      );
                      return;
                    }
                    setCurrency(val);
                  }}
                >
                  <SelectTrigger id="invoice-currency" className="bg-background/80 w-full">
                    <SelectValue placeholder="Currency">
                      {activeCurrency.code} ({activeCurrency.symbol})
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      <SelectLabel>Currencies</SelectLabel>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code} className="cursor-pointer">
                          <span className="font-mono font-medium">{curr.code}</span> ({curr.symbol})
                          — {curr.name}
                          {!settings?.isPro &&
                            curr.code !== (settings?.defaultCurrency || "USD") && (
                              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                                PRO
                              </span>
                            )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label htmlFor="issue-date" className="text-sm font-medium">
                  Issue Date
                </Label>
                <div className="relative">
                  <Input
                    id="issue-date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="bg-background/80 pr-8"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-sm font-medium">
                  Due Date
                </Label>
                <div className="relative">
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-background/80 pr-8"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">Presets:</span>
                  {[
                    { label: "On Receipt", days: 0 },
                    { label: "Net 7", days: 7 },
                    { label: "Net 14", days: 14 },
                    { label: "Net 30", days: 30 },
                    { label: "Net 60", days: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyDuePreset(preset.days)}
                      className="rounded border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Line Items Table */}
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    Line Items
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Add services, products, hours, or deliverables.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            {/* Table Header */}
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_6rem_7.5rem_7.5rem_2.5rem] items-center gap-3 px-2 text-xs font-medium text-muted-foreground">
                <span>#</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate ({activeCurrency.symbol})</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {items.map((item, index) => {
                  const lineAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                  return (
                    <div
                      key={item.id}
                      className="group relative grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-background/50 p-3 sm:grid-cols-[1.5rem_1fr_6rem_7.5rem_7.5rem_2.5rem] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
                    >
                      <span className="hidden sm:inline font-mono text-xs text-muted-foreground text-center">
                        {index + 1}
                      </span>

                      {/* Description */}
                      <div>
                        <span className="sm:hidden text-[11px] font-medium text-muted-foreground mb-1 block">
                          Description
                        </span>
                        <Input
                          value={item.description}
                          onChange={(e) => patchItem(item.id, { description: e.target.value })}
                          placeholder="e.g. Full-stack Web Development (Sprint 1)"
                          className="bg-background text-sm"
                        />
                      </div>

                      {/* Qty */}
                      <div>
                        <span className="sm:hidden text-[11px] font-medium text-muted-foreground mb-1 block">
                          Quantity
                        </span>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.5"
                          value={isNaN(item.quantity) ? "" : item.quantity}
                          onChange={(e) =>
                            patchItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="bg-background text-right font-mono text-sm"
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <span className="sm:hidden text-[11px] font-medium text-muted-foreground mb-1 block">
                          Rate ({activeCurrency.symbol})
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={isNaN(item.rate) ? "" : item.rate}
                          onChange={(e) =>
                            patchItem(item.id, { rate: parseFloat(e.target.value) || 0 })
                          }
                          className="bg-background text-right font-mono text-sm"
                        />
                      </div>

                      {/* Line Amount */}
                      <div className="flex items-center justify-between sm:justify-end">
                        <span className="sm:hidden text-[11px] font-medium text-muted-foreground">
                          Amount:
                        </span>
                        <span className="font-mono text-sm font-semibold text-foreground sm:text-right pr-2">
                          {formatMoney(lineAmount)}
                        </span>
                      </div>

                      {/* Delete */}
                      <div className="flex justify-end sm:justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addItem}
                  className="w-full border border-dashed border-border/80 hover:border-primary/50 text-xs text-muted-foreground hover:text-primary gap-1.5 h-9"
                >
                  <Plus className="h-4 w-4" />
                  Add another item
                </Button>
              </div>
            </div>
          </section>

          {/* Card 3: Notes & Terms */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-paper">
            <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                Notes & Payment Terms
              </h2>
            </div>

            <div className="space-y-2">
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Payment due within 14 days. Wire transfer details: Bank Name, Routing #, Account #. Thank you for your business!"
                className="bg-background/80 resize-y font-sans text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                These notes will be printed at the bottom of the invoice and PDF export.
              </p>
            </div>
          </section>
        </div>

        {/* Right Section: Summary & Action Card */}
        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            {/* Financial Summary Card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-5">
              <div className="border-b border-border/70 pb-3">
                <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Invoice Summary
                </h3>
                <p className="text-xs text-muted-foreground">
                  Real-time calculations for this invoice.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoney(subtotal)}
                  </span>
                </div>

                {/* Tax Rate Setting */}
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <Label htmlFor="tax-rate-input" className="text-xs cursor-pointer">
                      Tax Rate (%)
                    </Label>
                    <div className="relative w-24">
                      <Input
                        id="tax-rate-input"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={isNaN(taxRate) ? "" : taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-7 bg-background text-right font-mono text-xs pr-6"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground">
                        <Percent className="h-3 w-3" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>Tax Amount ({effectiveTaxRate}%)</span>
                    <span className="font-mono text-foreground">{formatMoney(taxAmount)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-border pt-4 flex items-baseline justify-between">
                  <span className="font-display text-lg font-bold text-foreground">Total Due</span>
                  <span className="font-display text-2xl font-bold text-primary font-mono">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>

              {/* Status & Details Pill */}
              <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #:</span>
                  <span className="font-mono font-medium text-foreground">
                    {invoiceNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">
                    {selectedClient ? selectedClient.name : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-mono text-foreground font-medium">
                    {activeCurrency.code} ({activeCurrency.symbol})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* Save & Finalize / Save Changes */}
                <Button
                  type="button"
                  size="lg"
                  disabled={savingStatus !== null}
                  onClick={() => handleSave(isEditing ? initialData?.status || "sent" : "sent")}
                  className="w-full gap-2 font-medium cursor-pointer shadow-sm"
                >
                  {savingStatus === "sent" ||
                  (isEditing && savingStatus !== null && savingStatus !== "draft") ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEditing ? "Updating invoice…" : "Finalizing invoice…"}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {isEditing ? "Update & Save Invoice" : "Save & Finalize"}
                    </>
                  )}
                </Button>

                {/* Save as Draft */}
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  disabled={savingStatus !== null}
                  onClick={() => handleSave("draft")}
                  className="w-full gap-2 cursor-pointer"
                >
                  {savingStatus === "draft" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving draft…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save as Draft
                    </>
                  )}
                </Button>

                {/* Cancel / Discard */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingStatus !== null}
                  onClick={() => {
                    if (onCancel) {
                      onCancel();
                    } else if (isEditing && (initialInvoiceId || initialData?.id)) {
                      navigate({
                        to: "/invoices/$id",
                        params: { id: initialInvoiceId || initialData!.id },
                      });
                    } else {
                      navigate({ to: "/invoices" });
                    }
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {isEditing ? "Cancel Edit" : "Discard & Return"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

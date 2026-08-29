import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Coins,
  FileDigit,
  Loader2,
  Percent,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Sparkles,
  Eye,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSettings, updateSettings } from "@/db/settings";
import { formatInvoiceNumber } from "@/db/invoices";
import { CURRENCIES, getCurrencyByCode } from "@/utils/currencies";
import type { Settings } from "@/types/settings";
import { SETTINGS_ID } from "@/types/settings";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — Local Ledger" },
      {
        name: "description",
        content: "Manage your business details, default currency, and invoice numbering.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your business identity, tax preferences, and invoice defaults.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Local IndexedDB
          </span>
        </div>
      </header>

      <ClientOnly
        fallback={
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading settings from local database…</p>
            </div>
          </div>
        }
      >
        <SettingsForm />
      </ClientOnly>
    </div>
  );
}

const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  businessName: "",
  businessAddress: "",
  businessLogo: "",
  taxRate: 0,
  defaultCurrency: "USD",
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
};

function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((loaded) => {
      // Ensure prefix has sensible fallback if empty
      const normalized: Settings = {
        ...DEFAULT_SETTINGS,
        ...loaded,
        invoicePrefix: loaded.invoicePrefix ?? "INV-",
      };
      setSettings(normalized);
    });
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (settings && !saving) {
          saveChanges(settings);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings, saving]);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Reading settings…</p>
        </div>
      </div>
    );
  }

  const patch = (p: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WebP, SVG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file is too large (max 2MB). Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        patch({ businessLogo: base64 });
        toast.success("Logo loaded. Remember to save your settings.");
      }
    };
    reader.onerror = () => {
      toast.error("Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeLogo = () => {
    patch({ businessLogo: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Logo removed.");
  };

  const saveChanges = async (settingsToSave: Settings) => {
    setSaving(true);
    try {
      // Clean prefix if empty
      const payload: Settings = {
        ...settingsToSave,
        invoicePrefix: settingsToSave.invoicePrefix.trim() || "INV-",
        taxRate: Number(settingsToSave.taxRate) || 0,
        nextInvoiceNumber: Math.max(1, Math.floor(Number(settingsToSave.nextInvoiceNumber) || 1)),
      };

      const updated = await updateSettings(payload);
      setSettings(updated);
      setHasUnsavedChanges(false);
      toast.success("Settings saved successfully!", {
        description: "Your business preferences are stored locally in IndexedDB.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings. Please check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      const updated = await updateSettings(DEFAULT_SETTINGS);
      setSettings(updated);
      setHasUnsavedChanges(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Settings reset to defaults.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveChanges(settings);
  };

  const selectedCurrency = getCurrencyByCode(settings.defaultCurrency);
  const sampleInvoiceNumber = formatInvoiceNumber(
    settings.invoicePrefix || "INV-",
    settings.nextInvoiceNumber || 1,
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Form Controls */}
        <div className="space-y-6 lg:col-span-7">
          {/* Business Details Section */}
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Business Identity
                </h2>
                <p className="text-xs text-muted-foreground">
                  Shown in the header of all issued invoices and PDF exports.
                </p>
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="business-name" className="text-sm font-medium">
                Business name
              </Label>
              <Input
                id="business-name"
                value={settings.businessName}
                onChange={(e) => patch({ businessName: e.target.value })}
                placeholder="e.g. Acme Design Studio LLC"
                className="bg-background/80 focus-visible:ring-primary"
              />
            </div>

            {/* Business Address */}
            <div className="space-y-2">
              <Label htmlFor="business-address" className="text-sm font-medium">
                Business address & tax details
              </Label>
              <Textarea
                id="business-address"
                rows={3}
                value={settings.businessAddress}
                onChange={(e) => patch({ businessAddress: e.target.value })}
                placeholder={
                  "123 Market Street, Suite 400\nSan Francisco, CA 94103\nTax ID / VAT: US-987654321"
                }
                className="bg-background/80 resize-y font-sans text-sm focus-visible:ring-primary leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Include your address, contact email/phone, or registration numbers.
              </p>
            </div>

            {/* Business Logo Upload */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">Business logo</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleLogoFile(e.target.files[0]);
                  }
                }}
              />

              {settings.businessLogo ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-border bg-background/60 p-4">
                  <div className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-white p-1.5 shadow-sm">
                    <img
                      src={settings.businessLogo}
                      alt="Business logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      Logo uploaded
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stored locally as Base64 in your offline database.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                        onClick={removeLogo}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/80 bg-background/50 hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload logo or drag and drop
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      PNG, JPG, SVG or WebP up to 2MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Invoice Defaults Section */}
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Financial Defaults
                </h2>
                <p className="text-xs text-muted-foreground">
                  Default currency and tax settings applied to newly created invoices.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Default Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency-select" className="text-sm font-medium">
                  Default currency
                </Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(val) => patch({ defaultCurrency: val })}
                >
                  <SelectTrigger id="currency-select" className="bg-background/80 w-full">
                    <SelectValue placeholder="Select currency">
                      {selectedCurrency.code} ({selectedCurrency.symbol}) — {selectedCurrency.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectGroup>
                      <SelectLabel>Currencies</SelectLabel>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code} className="cursor-pointer">
                          <span className="font-medium text-foreground mr-2 font-mono">
                            {curr.code}
                          </span>
                          <span className="text-muted-foreground">
                            ({curr.symbol}) — {curr.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used as the default currency for totals and line items.
                </p>
              </div>

              {/* Default Tax Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tax-rate" className="text-sm font-medium">
                    Default tax rate (%)
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {settings.taxRate}%
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="tax-rate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={isNaN(settings.taxRate) ? "" : settings.taxRate}
                    onChange={(e) => patch({ taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="bg-background/80 pr-8"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default percentage applied to invoice subtotals.
                </p>
              </div>
            </div>
          </section>

          {/* Numbering & Sequence Section */}
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileDigit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Invoice Numbering
                </h2>
                <p className="text-xs text-muted-foreground">
                  Customize the prefix and next number sequence for invoices.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Prefix */}
              <div className="space-y-2">
                <Label htmlFor="invoice-prefix" className="text-sm font-medium">
                  Invoice prefix
                </Label>
                <Input
                  id="invoice-prefix"
                  value={settings.invoicePrefix}
                  onChange={(e) => patch({ invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  className="bg-background/80 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  e.g., <code className="font-mono text-primary">INV-</code>,{" "}
                  <code className="font-mono text-primary">BILL-</code>,{" "}
                  <code className="font-mono text-primary">2026-</code>
                </p>
              </div>

              {/* Next Number */}
              <div className="space-y-2">
                <Label htmlFor="next-invoice-number" className="text-sm font-medium">
                  Next invoice number
                </Label>
                <Input
                  id="next-invoice-number"
                  type="number"
                  min={1}
                  step={1}
                  value={isNaN(settings.nextInvoiceNumber) ? "" : settings.nextInvoiceNumber}
                  onChange={(e) =>
                    patch({ nextInvoiceNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="bg-background/80 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Increments automatically after each invoice creation.
                </p>
              </div>
            </div>

            {/* Live Sample Badge */}
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Next generated invoice:</span>
              </div>
              <span className="rounded-md border border-primary/30 bg-card px-2.5 py-1 font-mono text-xs font-semibold text-primary shadow-xs">
                {sampleInvoiceNumber}
              </span>
            </div>
          </section>
        </div>

        {/* Right Column: Live Preview & Action Hub */}
        <div className="space-y-6 lg:col-span-5">
          {/* Header Mock Preview */}
          <div className="sticky top-6 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
              <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                    Live Header Preview
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Client View
                </span>
              </div>

              {/* Mock Invoice Header Card */}
              <div className="rounded-lg border border-border/80 bg-background/90 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-4">
                  {settings.businessLogo ? (
                    <div className="h-12 w-24 shrink-0 overflow-hidden rounded border border-border/60 bg-white p-1">
                      <img
                        src={settings.businessLogo}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}

                  <div className="text-right">
                    <span className="font-display text-base font-bold tracking-tight text-foreground">
                      INVOICE
                    </span>
                    <p className="font-mono text-xs text-primary font-medium mt-0.5">
                      #{sampleInvoiceNumber}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3">
                  <p className="font-semibold text-sm text-foreground">
                    {settings.businessName || "Your Business Name"}
                  </p>
                  <p className="mt-1 whitespace-pre-line font-sans text-xs text-muted-foreground leading-relaxed">
                    {settings.businessAddress ||
                      "123 Business Address\nCity, State, Country\nTax ID: 00-0000000"}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <div>
                    <span>Currency: </span>
                    <strong className="font-mono text-foreground font-semibold">
                      {selectedCurrency.code} ({selectedCurrency.symbol})
                    </strong>
                  </div>
                  <div>
                    <span>Tax: </span>
                    <strong className="font-mono text-foreground font-semibold">
                      {settings.taxRate}%
                    </strong>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                This preview updates live as you edit your business preferences.
              </p>
            </div>

            {/* Actions Card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {hasUnsavedChanges ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                      <Check className="h-3.5 w-3.5" />
                      All changes saved
                    </span>
                  )}
                </span>

                <span className="text-[11px] text-muted-foreground">
                  Shortcut:{" "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘S
                  </kbd>{" "}
                  /{" "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    Ctrl+S
                  </kbd>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  size="lg"
                  className="w-full gap-2 shadow-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving settings…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save settings
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset settings to defaults?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset your business name, address, logo, currency, tax rate, and
                        prefix back to default values. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetToDefaults}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reset settings
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

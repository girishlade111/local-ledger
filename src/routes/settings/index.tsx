import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Check,
  Coins,
  Crown,
  Download,
  DownloadCloud,
  Eye,
  FileDigit,
  HardDrive,
  Key,
  Loader2,
  Lock,
  Palette,
  Percent,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
  Zap,
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
import { getSettings, resetSettings, updateSettings } from "@/db/settings";
import { formatInvoiceNumber } from "@/db/invoices";
import {
  exportDatabaseBackup,
  restoreDatabaseBackup,
  validateBackupData,
  type BackupData,
} from "@/utils/backup";
import { SAMPLE_PRO_KEYS, validateLicenseKey } from "@/utils/license";
import { CURRENCIES, getCurrencyByCode } from "@/utils/currencies";
import type { Settings } from "@/types/settings";
import { SETTINGS_ID } from "@/types/settings";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — Local Ledger" },
      {
        name: "description",
        content:
          "Manage your business details, default currency, invoice numbering, licensing, and backup data.",
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
            Configure your business identity, tax preferences, PRO license, and offline backups.
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
  isPro: false,
  customPdfColor: "#166534",
  hidePdfWatermark: false,
};

const PDF_COLOR_PRESETS = [
  { label: "Forest Slate (Default)", value: "#166534" },
  { label: "Deep Navy", value: "#1e3a8a" },
  { label: "Royal Indigo", value: "#4338ca" },
  { label: "Emerald Green", value: "#047857" },
  { label: "Crimson Ruby", value: "#991b1b" },
  { label: "Charcoal Slate", value: "#334155" },
];

function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // License State
  const [licenseInput, setLicenseInput] = useState("");
  const [validatingLicense, setValidatingLicense] = useState(false);

  // Backup & Restore State
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  const loadSettingsData = async () => {
    const loaded = await getSettings();
    const normalized: Settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      invoicePrefix: loaded.invoicePrefix ?? "INV-",
    };
    setSettings(normalized);
    if (loaded.licenseKey) {
      setLicenseInput(loaded.licenseKey);
    }
  };

  useEffect(() => {
    loadSettingsData();
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
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
    toast.info("Logo removed.");
  };

  const saveChanges = async (currentSettings: Settings) => {
    setSaving(true);
    try {
      const saved = await updateSettings({
        businessName: currentSettings.businessName.trim(),
        businessAddress: currentSettings.businessAddress.trim(),
        businessLogo: currentSettings.businessLogo,
        taxRate: Number(currentSettings.taxRate) || 0,
        defaultCurrency: currentSettings.defaultCurrency || "USD",
        invoicePrefix: currentSettings.invoicePrefix.trim() || "INV-",
        nextInvoiceNumber: Math.max(1, Number(currentSettings.nextInvoiceNumber) || 1),
        isPro: currentSettings.isPro,
        licenseKey: currentSettings.licenseKey,
        proActivatedAt: currentSettings.proActivatedAt,
        proTier: currentSettings.proTier,
        customPdfColor: currentSettings.customPdfColor,
        hidePdfWatermark: currentSettings.hidePdfWatermark,
      });
      setSettings(saved);
      setHasUnsavedChanges(false);
      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      saveChanges(settings);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await resetSettings();
      await updateSettings(DEFAULT_SETTINGS);
      setSettings(DEFAULT_SETTINGS);
      setHasUnsavedChanges(false);
      toast.success("Settings reset to defaults.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset settings.");
    }
  };

  // License: Activation handler
  const handleActivateLicense = (keyToActivate?: string) => {
    const key = (keyToActivate || licenseInput).trim();
    if (!key) {
      toast.error("Please enter a license key.");
      return;
    }

    setValidatingLicense(true);
    setTimeout(async () => {
      const result = validateLicenseKey(key);
      if (!result.isValid) {
        toast.error(result.error || "Invalid license key.");
        setValidatingLicense(false);
        return;
      }

      try {
        const now = new Date().toISOString();
        const updated = await updateSettings({
          isPro: true,
          licenseKey: key.toUpperCase(),
          proActivatedAt: now,
          proTier: result.tier || "LIFETIME",
          hidePdfWatermark: true,
        });
        setSettings(updated);
        setLicenseInput(key.toUpperCase());
        toast.success(`Local Ledger PRO activated! (${result.tier} License)`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to activate license.");
      } finally {
        setValidatingLicense(false);
      }
    }, 400);
  };

  // License: Deactivation handler
  const handleDeactivateLicense = async () => {
    if (!confirm("Are you sure you want to deactivate PRO license on this device?")) {
      return;
    }
    try {
      const updated = await updateSettings({
        isPro: false,
        licenseKey: "",
        proActivatedAt: undefined,
        proTier: undefined,
        hidePdfWatermark: false,
      });
      setSettings(updated);
      setLicenseInput("");
      toast.info("PRO license deactivated.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate license.");
    }
  };

  // Backup: Export handler
  const handleExportBackup = async () => {
    setExportingBackup(true);
    try {
      const { filename, summary } = await exportDatabaseBackup();
      toast.success(
        `Backup downloaded (${summary.invoicesCount} invoices, ${summary.clientsCount} clients)!`,
      );
      await loadSettingsData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to export backup.");
    } finally {
      setExportingBackup(false);
    }
  };

  // Backup: Import selection handler
  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!validateBackupData(parsed)) {
          toast.error(
            "Invalid backup file format. Please select a valid Local Ledger backup JSON.",
          );
          return;
        }

        setPendingBackup(parsed);
        setImportConfirmOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("Could not parse backup JSON file.");
      }
    };
    reader.onerror = () => {
      toast.error("Could not read backup file.");
    };
    reader.readAsText(file);

    e.target.value = "";
  };

  // Backup: Confirm Restore handler
  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;

    setImportingBackup(true);
    try {
      await restoreDatabaseBackup(pendingBackup);
      toast.success(
        `Backup restored successfully! (${pendingBackup.invoices.length} invoices, ${pendingBackup.clients.length} clients)`,
      );
      setImportConfirmOpen(false);
      setPendingBackup(null);
      await loadSettingsData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore backup.");
    } finally {
      setImportingBackup(false);
    }
  };

  const sampleInvoiceNumber = formatInvoiceNumber(
    settings.invoicePrefix || "INV-",
    settings.nextInvoiceNumber || 1,
  );

  const selectedCurrency = getCurrencyByCode(settings.defaultCurrency || "USD");

  const lastBackupText = settings.lastBackupDate
    ? formatDistanceToNow(parseISO(settings.lastBackupDate), { addSuffix: true })
    : null;

  const isPro = Boolean(settings.isPro);

  return (
    <>
      {/* Import Confirmation Dialog */}
      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="font-display text-lg">
                Restore Offline Backup?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 pt-2 text-left">
              <p className="text-sm text-foreground font-medium">
                This will overwrite your current offline database with the backup data:
              </p>
              {pendingBackup && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoices:</span>
                    <span className="font-bold text-foreground">
                      {pendingBackup.invoices.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clients:</span>
                    <span className="font-bold text-foreground">
                      {pendingBackup.clients.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Line Items:</span>
                    <span className="font-bold text-foreground">
                      {pendingBackup.invoiceItems.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Backup Date:</span>
                    <span className="text-foreground">
                      {format(parseISO(pendingBackup.exportedAt), "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-destructive font-medium">
                ⚠️ Warning: All current data on this device will be replaced. This action cannot be
                undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={importingBackup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={importingBackup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {importingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring…
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Confirm & Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Settings Cards */}
          <div className="space-y-6 lg:col-span-7">
            {/* Card 1: Business Identity */}
            <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    Business Profile
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Your company name and address printed on invoice headers.
                  </p>
                </div>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business-name" className="text-sm font-medium">
                  Business / Freelancer name
                </Label>
                <Input
                  id="business-name"
                  value={settings.businessName}
                  onChange={(e) => patch({ businessName: e.target.value })}
                  placeholder="e.g. Acme Design Studio or Jane Doe"
                  className="bg-background/80 focus-visible:ring-primary font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  Appears as the primary sender on all issued invoices.
                </p>
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
                    if (e.target.files && e.target.files[0]) {
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

            {/* Card 2: PRO License & Custom Branding */}
            <section className="space-y-5 rounded-xl border-2 border-primary/40 bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                      Local Ledger PRO
                      {isPro && (
                        <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                          ACTIVE ⭐
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Client-side offline license activation and premium branding.
                    </p>
                  </div>
                </div>

                <Button asChild variant="ghost" size="sm" className="text-xs text-primary gap-1">
                  <Link to="/pro">{isPro ? "View Features" : "Upgrade to PRO →"}</Link>
                </Button>
              </div>

              {isPro ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        PRO License Active ({settings.proTier || "LIFETIME"})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeactivateLicense}
                        className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                      >
                        Deactivate
                      </Button>
                    </div>
                    <p className="font-mono text-muted-foreground">
                      Key: {settings.licenseKey || "LLPRO-xxxx"}
                    </p>
                  </div>

                  {/* PRO Unlocked Feature: Custom PDF Accent Color */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pdf-color"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Palette className="h-4 w-4 text-primary" />
                        Custom PDF Branding Accent Color
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {settings.customPdfColor || "#166534"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PDF_COLOR_PRESETS.map((preset) => {
                        const active = (settings.customPdfColor || "#166534") === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => patch({ customPdfColor: preset.value })}
                            className={`flex items-center gap-2 rounded-lg border p-2 text-xs text-left transition-colors cursor-pointer ${
                              active
                                ? "border-primary bg-primary/10 font-semibold text-foreground"
                                : "border-border/80 hover:bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs border border-white/20"
                              style={{ backgroundColor: preset.value }}
                            />
                            <span className="truncate">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRO Unlocked Feature: Hide PDF Watermark */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg border border-border/80 bg-background/50 p-3">
                      <input
                        type="checkbox"
                        checked={settings.hidePdfWatermark ?? true}
                        onChange={(e) => patch({ hidePdfWatermark: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground block">
                          Remove PDF Footer Watermark (White-Label)
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Omit "Made with Local Ledger" footer from downloaded PDF invoices.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-license-input" className="text-xs font-medium">
                      Enter License Key
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="settings-license-input"
                        value={licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value)}
                        placeholder="LLPRO-LIFETIME-XXXX-XXXXXX"
                        className="font-mono text-xs uppercase bg-background"
                      />
                      <Button
                        type="button"
                        onClick={() => handleActivateLicense()}
                        disabled={validatingLicense || !licenseInput.trim()}
                        className="text-xs shrink-0 cursor-pointer shadow-xs gap-1.5"
                      >
                        {validatingLicense ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Validating…
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Demo key hint */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Try evaluation key:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLicenseInput("LLPRO-DEMO-2026-ACTIVE");
                        handleActivateLicense("LLPRO-DEMO-2026-ACTIVE");
                      }}
                      className="font-mono text-primary hover:underline cursor-pointer"
                    >
                      LLPRO-DEMO-2026-ACTIVE
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Card 3: Financial Defaults */}
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
                        {selectedCurrency.code} ({selectedCurrency.symbol}) —{" "}
                        {selectedCurrency.name}
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
                </div>

                {/* Default Tax Rate */}
                <div className="space-y-2">
                  <Label htmlFor="default-tax-rate" className="text-sm font-medium">
                    Default tax rate (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="default-tax-rate"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={isNaN(settings.taxRate) ? "" : settings.taxRate}
                      onChange={(e) => patch({ taxRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="bg-background/80 font-mono text-sm pr-8"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                      <Percent className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 4: Invoice Numbering Sequence */}
            <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileDigit className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    Invoice Numbering Sequence
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
                  <span className="text-xs font-medium text-foreground">
                    Next generated invoice:
                  </span>
                </div>
                <span className="rounded-md border border-primary/30 bg-card px-2.5 py-1 font-mono text-xs font-semibold text-primary shadow-xs">
                  {sampleInvoiceNumber}
                </span>
              </div>
            </section>

            {/* Card 5: Backup & Restore (CRITICAL) */}
            <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-paper transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2.5 border-b border-border/70 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    Backup & Restore Data
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Export your complete database to JSON or restore from an existing backup file.
                  </p>
                </div>
              </div>

              {/* Last Backup Notice */}
              <div className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Storage Status:
                  </span>
                  <span className="font-semibold text-foreground">Offline IndexedDB</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Last Backup:</span>
                  <span className="font-medium text-foreground">
                    {lastBackupText ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {format(parseISO(settings.lastBackupDate!), "yyyy-MM-dd HH:mm")} (
                        {lastBackupText})
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        No backup taken yet
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Hidden file input for restore */}
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleBackupFileSelect}
              />

              {/* Export & Import Action Buttons */}
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                {/* Export Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportBackup}
                  disabled={exportingBackup}
                  className="gap-2 text-xs font-medium h-10 cursor-pointer shadow-xs"
                >
                  {exportingBackup ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="h-4 w-4 text-primary" />
                      Export Data (JSON)
                    </>
                  )}
                </Button>

                {/* Import Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backupFileInputRef.current?.click()}
                  className="gap-2 text-xs font-medium h-10 cursor-pointer shadow-xs"
                >
                  <UploadCloud className="h-4 w-4 text-primary" />
                  Import Data (JSON)
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Exporting creates a full JSON snapshot of all clients, invoices, items, settings,
                and license data. Keep regular backups to safeguard against accidental browser
                clearing.
              </p>
            </section>
          </div>

          {/* Right Column: Live Preview & Action Hub */}
          <div className="space-y-6 lg:col-span-5">
            <div className="sticky top-6 space-y-6">
              {/* Header Mock Preview */}
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
    </>
  );
}

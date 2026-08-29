import { useEffect, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Coins,
  Crown,
  Download,
  FileSpreadsheet,
  Globe,
  Key,
  Layers,
  Loader2,
  Lock,
  Palette,
  Repeat,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings } from "@/db/settings";
import { SAMPLE_PRO_KEYS, validateLicenseKey } from "@/utils/license";
import type { Settings } from "@/types/settings";

export const Route = createFileRoute("/pro/")({
  head: () => ({
    meta: [
      { title: "Upgrade to PRO — Local Ledger" },
      {
        name: "description",
        content:
          "Unlock advanced offline invoicing features, custom branding, multi-currency, and clean PDFs.",
      },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
          <p className="text-sm font-medium animate-pulse">Loading PRO features…</p>
        </div>
      }
    >
      <ProContent />
    </ClientOnly>
  );
}

function ProContent() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [validating, setValidating] = useState(false);

  const refreshSettings = async () => {
    const s = await getSettings();
    setSettings(s);
    if (s.licenseKey) {
      setLicenseKeyInput(s.licenseKey);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const handleActivate = async (keyToUse?: string) => {
    const key = (keyToUse || licenseKeyInput).trim();
    if (!key) {
      toast.error("Please enter a license key.");
      return;
    }

    setValidating(true);
    // Simulate brief instant validation feel
    setTimeout(async () => {
      const result = validateLicenseKey(key);

      if (!result.isValid) {
        toast.error(result.error || "Invalid license key.");
        setValidating(false);
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
        toast.success(`Local Ledger PRO activated! (${result.tier} License)`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to save license state.");
      } finally {
        setValidating(false);
      }
    }, 400);
  };

  const handleDeactivate = async () => {
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
      setLicenseKeyInput("");
      toast.info("PRO license deactivated.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate license.");
    }
  };

  if (!settings) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        <p className="text-sm font-medium animate-pulse">Reading license data…</p>
      </div>
    );
  }

  const isPro = Boolean(settings.isPro);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 via-primary/5 to-background p-8 sm:p-12 text-center shadow-paper">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary shadow-xs">
            <Crown className="h-4 w-4" />
            {isPro ? "PRO ACTIVE · LIFETIME LICENSE" : "UPGRADE TO LOCAL LEDGER PRO"}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {isPro ? "You are on Local Ledger PRO" : "Power Up Your Offline Invoicing"}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {isPro
              ? "All premium offline features, multi-currency support, custom PDF palettes, and unbranded exports are unlocked on this device."
              : "Unlock recurring invoices, multi-currency per invoice, custom brand palettes, and remove the PDF watermark forever. One-time purchase, 100% offline."}
          </p>
        </div>
      </div>

      {/* License Key Activation Card */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                {isPro ? "Active License Details" : "Activate Your License Key"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isPro
                  ? "Your offline license is active on this browser."
                  : "Enter the license key received after your purchase on Gumroad or LemonSqueezy."}
              </p>
            </div>
          </div>

          {isPro && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Verified Offline
            </span>
          )}
        </div>

        {isPro ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-border/80 bg-background/60 p-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">License Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  ACTIVE (PRO)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">License Key:</span>
                <span className="font-mono font-medium text-foreground">
                  {settings.licenseKey || "LLPRO-LIFETIME-xxxx"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Activated On:</span>
                <span className="font-medium text-foreground">
                  {settings.proActivatedAt
                    ? format(parseISO(settings.proActivatedAt), "yyyy-MM-dd HH:mm")
                    : "Active"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Deactivate License
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="license-key-input" className="text-sm font-medium">
                License Key
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="license-key-input"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="LLPRO-LIFETIME-XXXX-XXXXXX"
                  className="font-mono text-sm uppercase bg-background"
                />
                <Button
                  onClick={() => handleActivate()}
                  disabled={validating || !licenseKeyInput.trim()}
                  className="gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  {validating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Activate License
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No server request needed. The cryptographic checksum is validated instantly on your
                device.
              </p>
            </div>

            {/* Test Key Quick-Fill Helper for Evaluation */}
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-3.5 space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Evaluation / Demo License Key:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {SAMPLE_PRO_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setLicenseKeyInput(key);
                      handleActivate(key);
                    }}
                    className="font-mono text-[11px] rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-2.5 py-1 transition-colors cursor-pointer"
                  >
                    {key} (Click to test)
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Feature Comparison Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Free vs. PRO Comparison
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Free tier remains completely functional for simple invoicing. PRO unlocks advanced
            flexibility.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free Tier Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-paper space-y-5">
            <div className="border-b border-border/70 pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">Free Tier</h3>
              <p className="text-xs text-muted-foreground">
                Everything you need for essential offline invoicing.
              </p>
              <div className="mt-3">
                <span className="font-display text-2xl font-bold text-foreground">$0</span>
                <span className="text-xs text-muted-foreground ml-1.5">Forever Free</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground">
              <li className="flex items-center gap-2.5 text-foreground">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Unlimited invoices & clients stored locally</span>
              </li>
              <li className="flex items-center gap-2.5 text-foreground">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Full JSON offline backup & restore</span>
              </li>
              <li className="flex items-center gap-2.5 text-foreground">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Business logo upload & print PDF exports</span>
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground opacity-80">
                <span className="h-4 w-4 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0">
                  —
                </span>
                <span>Single business default currency</span>
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground opacity-80">
                <span className="h-4 w-4 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0">
                  —
                </span>
                <span>Standard PDF styling with footer watermark</span>
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground opacity-80">
                <span className="h-4 w-4 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0">
                  —
                </span>
                <span>Max 3 invoice item presets</span>
              </li>
            </ul>
          </div>

          {/* PRO Tier Card */}
          <div className="rounded-xl border-2 border-primary bg-card p-6 shadow-paper space-y-5 relative">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                PRO
              </span>
            </div>

            <div className="border-b border-border/70 pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">PRO License</h3>
              <p className="text-xs text-muted-foreground">
                For growing freelancers and boutique agencies.
              </p>
              <div className="mt-3">
                <span className="font-display text-2xl font-bold text-primary">$29</span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  One-time payment (Lifetime)
                </span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>Everything in Free Tier</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Multi-Currency per invoice</strong> (USD, EUR, GBP, JPY, INR, etc.)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Palette className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Custom PDF branding & accent colors</strong>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Remove PDF footer watermark</strong> (100% white-label exports)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Repeat className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Recurring invoices & unlimited templates</strong>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Lifetime offline updates & zero telemetry</strong>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

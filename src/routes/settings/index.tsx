import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSettings, updateSettings } from "@/db/settings";
import { useEffect, useState } from "react";
import type { Settings } from "@/types/settings";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [{ title: "Settings — Local Ledger" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure your business details and invoice defaults.
        </p>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SettingsForm />
      </ClientOnly>
    </div>
  );
}

function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (settings === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  const patch = (p: Partial<Settings>) => {
    setSettings({ ...settings, ...p });
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateSettings(settings);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-paper">
        <h2 className="font-display text-lg">Business details</h2>
        <div className="space-y-2">
          <Label htmlFor="business-name">Business name</Label>
          <Input
            id="business-name"
            value={settings.businessName}
            onChange={(e) => patch({ businessName: e.target.value })}
            placeholder="Your Studio LLC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="business-address">Business address</Label>
          <Textarea
            id="business-address"
            value={settings.businessAddress}
            onChange={(e) => patch({ businessAddress: e.target.value })}
            placeholder="123 Main St, City, Country"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-paper">
        <h2 className="font-display text-lg">Invoice defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prefix">Invoice prefix</Label>
            <Input
              id="prefix"
              value={settings.invoicePrefix}
              onChange={(e) => patch({ invoicePrefix: e.target.value })}
              placeholder="INV"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Default currency</Label>
            <Input
              id="currency"
              value={settings.defaultCurrency}
              onChange={(e) => patch({ defaultCurrency: e.target.value })}
              placeholder="USD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min={0}
              step="0.01"
              value={settings.taxRate}
              onChange={(e) => patch({ taxRate: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-number">Next invoice number</Label>
            <Input
              id="next-number"
              type="number"
              min={1}
              value={settings.nextInvoiceNumber}
              onChange={(e) => patch({ nextInvoiceNumber: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Settings saved.</p>}
      </div>
    </form>
  );
}

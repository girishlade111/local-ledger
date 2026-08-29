import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice, nextInvoiceNumber } from "@/db/invoices";
import { createInvoiceItem } from "@/db/invoice-items";
import { createClient } from "@/db/clients";
import { getSettings, updateSettings } from "@/db/settings";
import { invoiceTotal } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import { money } from "@/utils/format";

const today = () => format(new Date(), "yyyy-MM-dd");

type DraftItem = Omit<InvoiceItem, "id" | "invoiceId"> & { id: string };

const emptyItem = (): DraftItem => ({
  id: uuid(),
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
});

export function InvoiceForm() {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) =>
      nextInvoiceNumber(s.invoicePrefix, s.nextInvoiceNumber).then(setNumber),
    );
  }, []);

  const patchItem = (id: string, patch: Partial<DraftItem>) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, ...patch, amount: (patch.quantity ?? i.quantity) * (patch.rate ?? i.rate) }
          : i,
      ),
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const settings = await getSettings();
    const client = await createClient({
      name: clientName,
      email: clientEmail,
      address: "",
      phone: "",
    });
    const invoice = await createInvoice({
      invoiceNumber: number,
      clientId: client.id,
      status: "draft",
      issueDate,
      dueDate,
      currency: settings.defaultCurrency,
      notes,
    });
    for (const item of items) {
      await createInvoiceItem({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
      });
    }
    await updateSettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });
    navigate({ to: "/invoices" });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="number">Invoice number</Label>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Acme Studio"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Client email</Label>
          <Input
            id="email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="billing@acme.co"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="issue">Issued</Label>
            <Input
              id="issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Due</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Line items</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setItems((p) => [...p, emptyItem()])}
          >
            Add item
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_5rem_7rem_2rem] items-center gap-2">
              <Input
                aria-label="Description"
                value={item.description}
                onChange={(e) => patchItem(item.id, { description: e.target.value })}
                placeholder="Design sprint"
              />
              <Input
                aria-label="Quantity"
                type="number"
                min={0}
                step="0.5"
                value={item.quantity}
                onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) })}
              />
              <Input
                aria-label="Rate"
                type="number"
                min={0}
                step="0.01"
                value={item.rate}
                onChange={(e) => patchItem(item.id, { rate: Number(e.target.value) })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove item"
                onClick={() =>
                  setItems((p) => (p.length > 1 ? p.filter((i) => i.id !== item.id) : p))
                }
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        <p className="text-right text-lg">
          Total{" "}
          <span className="font-display font-semibold">
            {money(invoiceTotal(items.map((i) => ({ ...i, invoiceId: "" }))))}
          </span>
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment via bank transfer within 14 days."
        />
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save invoice"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/invoices" })}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

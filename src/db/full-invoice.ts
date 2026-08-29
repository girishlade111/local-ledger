import { db } from "./db";
import type { Invoice } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import type { Client } from "@/types/client";

export interface FullInvoice extends Invoice {
  items: InvoiceItem[];
  client: Client | undefined;
}

export async function getFullInvoice(id: string): Promise<FullInvoice | undefined> {
  const invoice = await db.invoices.get(id);
  if (!invoice) return undefined;
  const items = await db.invoiceItems.where("invoiceId").equals(id).toArray();
  const client = await db.clients.get(invoice.clientId);
  return { ...invoice, items, client };
}

export async function listFullInvoices(): Promise<FullInvoice[]> {
  const invoices = await db.invoices.orderBy("createdAt").reverse().toArray();
  const items = await db.invoiceItems.toArray();
  const clients = await db.clients.toArray();
  return invoices.map((invoice) => ({
    ...invoice,
    items: items.filter((i) => i.invoiceId === invoice.id),
    client: clients.find((c) => c.id === invoice.clientId),
  }));
}

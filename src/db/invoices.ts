import { v4 as uuid } from "uuid";
import { db } from "./db";
import type { Invoice, InvoiceStatus } from "@/types/invoice";

export const listInvoices = () => db.invoices.orderBy("createdAt").reverse().toArray();

export const listInvoicesByStatus = (status: InvoiceStatus) =>
  db.invoices.where("status").equals(status).reverse().sortBy("createdAt");

export const listInvoicesByClient = (clientId: string) =>
  db.invoices.where("clientId").equals(clientId).reverse().sortBy("createdAt");

export const getInvoice = (id: string) => db.invoices.get(id);

export const createInvoice = (input: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
  const now = new Date().toISOString();
  return db.invoices.put({ ...input, id: uuid(), createdAt: now, updatedAt: now });
};

export const updateInvoice = (id: string, patch: Partial<Invoice>) =>
  db.invoices.update(id, { ...patch, updatedAt: new Date().toISOString() });

export const deleteInvoice = async (id: string) => {
  await db.invoiceItems.where("invoiceId").equals(id).delete();
  await db.invoices.delete(id);
};

export function formatInvoiceNumber(prefix: string, number: number) {
  const cleanPrefix = (prefix || "INV").trim();
  const sep = cleanPrefix.endsWith("-") || cleanPrefix.endsWith("/") ? "" : "-";
  return `${cleanPrefix}${sep}${String(number).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(prefix: string, nextNumber: number) {
  return formatInvoiceNumber(prefix, nextNumber);
}

export interface CreateInvoicePayload {
  invoiceNumber: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate?: number;
  notes: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
}

export async function createInvoiceTransaction(data: CreateInvoicePayload): Promise<Invoice> {
  const now = new Date().toISOString();
  const invoiceId = uuid();

  const invoice: Invoice = {
    id: invoiceId,
    invoiceNumber: data.invoiceNumber,
    clientId: data.clientId,
    status: data.status,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    currency: data.currency,
    taxRate: data.taxRate ?? 0,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction("rw", [db.invoices, db.invoiceItems, db.settings], async () => {
    // 1. Insert invoice
    await db.invoices.put(invoice);

    // 2. Insert items
    for (const item of data.items) {
      await db.invoiceItems.put({
        id: uuid(),
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      });
    }

    // 3. Increment settings nextInvoiceNumber
    const currentSettings = await db.settings.get("app-settings");
    if (currentSettings) {
      await db.settings.update("app-settings", {
        nextInvoiceNumber: (currentSettings.nextInvoiceNumber || 1) + 1,
      });
    }
  });

  return invoice;
}

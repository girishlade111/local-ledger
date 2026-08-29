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
    } else {
      await db.settings.put({
        id: "app-settings",
        businessName: "",
        businessAddress: "",
        businessLogo: "",
        taxRate: data.taxRate ?? 0,
        defaultCurrency: data.currency || "USD",
        invoicePrefix: "INV",
        nextInvoiceNumber: 2,
      });
    }
  });

  return invoice;
}

export async function duplicateInvoiceTransaction(sourceInvoiceId: string): Promise<Invoice> {
  const sourceInvoice = await db.invoices.get(sourceInvoiceId);
  if (!sourceInvoice) throw new Error("Invoice not found");

  const sourceItems = await db.invoiceItems.where("invoiceId").equals(sourceInvoiceId).toArray();
  const settings = (await db.settings.get("app-settings")) || {
    invoicePrefix: "INV",
    nextInvoiceNumber: 1,
  };

  const newNumber = formatInvoiceNumber(
    settings.invoicePrefix || "INV",
    settings.nextInvoiceNumber || 1,
  );

  return createInvoiceTransaction({
    invoiceNumber: newNumber,
    clientId: sourceInvoice.clientId,
    status: "draft",
    issueDate: new Date().toISOString().split("T")[0] || "2026-01-01",
    dueDate: sourceInvoice.dueDate,
    currency: sourceInvoice.currency || "USD",
    taxRate: sourceInvoice.taxRate ?? 0,
    notes: sourceInvoice.notes || "",
    items: sourceItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
    })),
  });
}

export interface UpdateInvoicePayload {
  id: string;
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

export async function updateInvoiceTransaction(data: UpdateInvoicePayload): Promise<Invoice> {
  const now = new Date().toISOString();

  await db.transaction("rw", [db.invoices, db.invoiceItems], async () => {
    await db.invoices.update(data.id, {
      invoiceNumber: data.invoiceNumber,
      clientId: data.clientId,
      status: data.status,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      currency: data.currency,
      taxRate: data.taxRate ?? 0,
      notes: data.notes,
      updatedAt: now,
    });

    await db.invoiceItems.where("invoiceId").equals(data.id).delete();
    for (const item of data.items) {
      await db.invoiceItems.put({
        id: uuid(),
        invoiceId: data.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      });
    }
  });

  const updated = await db.invoices.get(data.id);
  if (!updated) throw new Error("Updated invoice not found");
  return updated;
}

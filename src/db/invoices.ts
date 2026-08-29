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
  const count = await db.invoices.count();
  return formatInvoiceNumber(prefix, nextNumber + count);
}

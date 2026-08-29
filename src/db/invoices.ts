import { v4 as uuid } from "uuid";
import { db } from "./db";
import type { Invoice, LineItem } from "@/types/invoice";

export const listInvoices = () => db.invoices.orderBy("createdAt").reverse().toArray();

export const getInvoice = (id: string) => db.invoices.get(id);

export const deleteInvoice = (id: string) => db.invoices.delete(id);

export const emptyLineItem = (): LineItem => ({
  id: uuid(),
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export async function nextInvoiceNumber() {
  const count = await db.invoices.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function saveInvoice(input: Omit<Invoice, "id" | "createdAt"> & { id?: string }) {
  const invoice: Invoice = {
    ...input,
    id: input.id ?? uuid(),
    createdAt: new Date().toISOString(),
  };
  await db.invoices.put(invoice);
  return invoice;
}

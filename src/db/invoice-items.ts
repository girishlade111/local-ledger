import { v4 as uuid } from "uuid";
import { db } from "./db";
import type { InvoiceItem } from "@/types/invoice-item";

export const listInvoiceItems = (invoiceId: string) =>
  db.invoiceItems.where("invoiceId").equals(invoiceId).toArray();

export const getInvoiceItem = (id: string) => db.invoiceItems.get(id);

export const createInvoiceItem = (input: Omit<InvoiceItem, "id">) =>
  db.invoiceItems.put({ ...input, id: uuid() });

export const updateInvoiceItem = (id: string, patch: Partial<InvoiceItem>) =>
  db.invoiceItems.update(id, patch);

export const deleteInvoiceItem = (id: string) => db.invoiceItems.delete(id);

export const deleteInvoiceItems = (invoiceId: string) =>
  db.invoiceItems.where("invoiceId").equals(invoiceId).delete();

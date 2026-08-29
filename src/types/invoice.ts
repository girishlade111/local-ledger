import type { InvoiceItem } from "./invoice-item";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string; // ISO
  dueDate: string; // ISO
  currency: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const invoiceTotal = (items: InvoiceItem[]) =>
  items.reduce((sum, i) => sum + i.quantity * i.rate, 0);

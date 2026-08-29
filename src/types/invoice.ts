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
  taxRate?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const invoiceSubtotal = (items: InvoiceItem[]): number =>
  items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);

export const invoiceTaxAmount = (subtotal: number, taxRate: number = 0): number =>
  subtotal * ((Number(taxRate) || 0) / 100);

export const invoiceTotal = (items: InvoiceItem[], taxRate: number = 0): number => {
  const subtotal = invoiceSubtotal(items);
  return subtotal + invoiceTaxAmount(subtotal, taxRate);
};

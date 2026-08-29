export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  notes: string;
  items: LineItem[];
  createdAt: string;
}

export const invoiceTotal = (invoice: Pick<Invoice, "items">) =>
  invoice.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

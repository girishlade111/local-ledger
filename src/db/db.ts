import Dexie, { type EntityTable } from "dexie";
import type { Client } from "@/types/client";
import type { Invoice } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import type { Settings } from "@/types/settings";

const db = new Dexie("InvoiceDB") as Dexie & {
  clients: EntityTable<Client, "id">;
  invoices: EntityTable<Invoice, "id">;
  invoiceItems: EntityTable<InvoiceItem, "id">;
  settings: EntityTable<Settings, "id">;
};

db.version(1).stores({
  clients: "id, name, email, createdAt",
  invoices: "id, invoiceNumber, clientId, status, issueDate, dueDate, createdAt, updatedAt",
  invoiceItems: "id, invoiceId, [invoiceId+description]",
  settings: "id",
});

export { db };

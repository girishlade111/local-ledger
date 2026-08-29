import Dexie, { type EntityTable } from "dexie";
import type { Invoice } from "@/types/invoice";

// Local-only storage: everything lives in the browser's IndexedDB.
const db = new Dexie("local-invoice") as Dexie & {
  invoices: EntityTable<Invoice, "id">;
};

db.version(1).stores({
  invoices: "id, number, clientName, issueDate, createdAt",
});

export { db };

import { format } from "date-fns";
import { db } from "@/db/db";
import { getSettings, updateSettings } from "@/db/settings";
import type { Client } from "@/types/client";
import type { Invoice } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import type { Settings } from "@/types/settings";

export interface BackupData {
  version: number;
  app: string;
  exportedAt: string;
  summary: {
    clientsCount: number;
    invoicesCount: number;
    invoiceItemsCount: number;
  };
  clients: Client[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  settings: Settings;
}

/**
 * Export all IndexedDB tables as a JSON file and update lastBackupDate in settings
 */
export async function exportDatabaseBackup(): Promise<{
  filename: string;
  summary: BackupData["summary"];
}> {
  const [clients, invoices, invoiceItems, settings] = await Promise.all([
    db.clients.toArray(),
    db.invoices.toArray(),
    db.invoiceItems.toArray(),
    getSettings(),
  ]);

  const now = new Date().toISOString();

  // Update last backup timestamp
  await updateSettings({ lastBackupDate: now });

  const backupData: BackupData = {
    version: 1,
    app: "Local Ledger",
    exportedAt: now,
    summary: {
      clientsCount: clients.length,
      invoicesCount: invoices.length,
      invoiceItemsCount: invoiceItems.length,
    },
    clients,
    invoices,
    invoiceItems,
    settings: {
      ...settings,
      lastBackupDate: now,
    },
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
  const filename = `local-ledger-backup-${dateStr}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, summary: backupData.summary };
}

/**
 * Validate imported JSON structure
 */
export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj["version"] !== "number") return false;
  if (!Array.isArray(obj["clients"])) return false;
  if (!Array.isArray(obj["invoices"])) return false;
  if (!Array.isArray(obj["invoiceItems"])) return false;
  if (!obj["settings"] || typeof obj["settings"] !== "object") return false;

  return true;
}

/**
 * Restore backup data into Dexie within an atomic transaction
 */
export async function restoreDatabaseBackup(data: BackupData): Promise<void> {
  if (!validateBackupData(data)) {
    throw new Error("Invalid backup data format. Please select a valid Local Ledger backup file.");
  }

  const now = new Date().toISOString();

  await db.transaction("rw", [db.clients, db.invoices, db.invoiceItems, db.settings], async () => {
    // 1. Clear existing tables
    await db.clients.clear();
    await db.invoices.clear();
    await db.invoiceItems.clear();
    await db.settings.clear();

    // 2. Insert clients
    if (data.clients.length > 0) {
      await db.clients.bulkPut(data.clients);
    }

    // 3. Insert invoices
    if (data.invoices.length > 0) {
      await db.invoices.bulkPut(data.invoices);
    }

    // 4. Insert invoice items
    if (data.invoiceItems.length > 0) {
      await db.invoiceItems.bulkPut(data.invoiceItems);
    }

    // 5. Restore settings with updated backup timestamp
    const restoredSettings: Settings = {
      ...data.settings,
      lastBackupDate: now,
    };
    await db.settings.put(restoredSettings);
  });
}

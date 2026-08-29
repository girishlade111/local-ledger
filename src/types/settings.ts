export const SETTINGS_ID = "app-settings";

export interface Settings {
  id: string;
  businessName: string;
  businessAddress: string;
  businessLogo: string; // base64
  taxRate: number;
  defaultCurrency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  lastBackupDate?: string | undefined;
  licenseKey?: string | undefined;
  isPro?: boolean | undefined;
  proActivatedAt?: string | undefined;
  proTier?: string | undefined;
  customPdfColor?: string | undefined;
  hidePdfWatermark?: boolean | undefined;
}

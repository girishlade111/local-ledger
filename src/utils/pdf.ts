import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FullInvoice } from "@/db/full-invoice";
import { getSettings } from "@/db/settings";
import type { Settings } from "@/types/settings";
import { money, shortDate } from "./format";

function hexToPdfRgb(hex?: string) {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return rgb(0.12, 0.25, 0.2); // default slate/forest
  }
  const clean = hex.slice(1);
  const c0 = clean.charAt(0) || "0";
  const c1 = clean.charAt(1) || "0";
  const c2 = clean.charAt(2) || "0";
  const r = parseInt(clean.length === 3 ? c0 + c0 : clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.length === 3 ? c1 + c1 : clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.length === 3 ? c2 + c2 : clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0.12 : r, isNaN(g) ? 0.25 : g, isNaN(b) ? 0.2 : b);
}

export async function invoiceToPdfBlob(invoice: FullInvoice, customSettings?: Settings) {
  const settings = customSettings || (await getSettings());
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // Standard A4 dimensions in points
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Palette: support PRO custom accent color
  const colorPrimary =
    settings.isPro && settings.customPdfColor
      ? hexToPdfRgb(settings.customPdfColor)
      : rgb(0.12, 0.25, 0.2); // deep slate/forest
  const colorDark = rgb(0.1, 0.12, 0.15); // near black for primary text
  const colorMuted = rgb(0.42, 0.46, 0.52); // slate gray
  const colorLightBorder = rgb(0.88, 0.9, 0.92); // light border
  const colorTableHead = rgb(0.95, 0.96, 0.97); // soft table header fill

  let y = 780;
  const margin = 45;
  const pageWidth = 595.28;
  const contentWidth = pageWidth - margin * 2; // 505.28

  // Helper: draw text
  const drawText = (
    value: string,
    opts: {
      x?: number;
      y?: number;
      size?: number;
      bold?: boolean;
      color?: typeof colorDark;
      align?: "left" | "right";
    } = {},
  ) => {
    const textFont = opts.bold ? bold : font;
    const textSize = opts.size ?? 10;
    const textColor = opts.color ?? colorDark;
    const textY = opts.y ?? y;

    let textX = opts.x ?? margin;
    if (opts.align === "right" && opts.x !== undefined) {
      const width = textFont.widthOfTextAtSize(value, textSize);
      textX = opts.x - width;
    }

    page.drawText(value, {
      x: textX,
      y: textY,
      size: textSize,
      font: textFont,
      color: textColor,
    });
  };

  // 1. Embed Business Logo if present
  let logoDrawn = false;
  if (settings.businessLogo && typeof settings.businessLogo === "string") {
    try {
      const base64Data = settings.businessLogo;
      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      if (base64Content) {
        const imageBytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
        let embeddedImage;
        if (base64Data.includes("image/png") || base64Data.startsWith("data:image/png")) {
          embeddedImage = await doc.embedPng(imageBytes);
        } else if (
          base64Data.includes("image/jpeg") ||
          base64Data.includes("image/jpg") ||
          base64Data.startsWith("data:image/jpeg")
        ) {
          embeddedImage = await doc.embedJpg(imageBytes);
        } else {
          try {
            embeddedImage = await doc.embedPng(imageBytes);
          } catch {
            embeddedImage = await doc.embedJpg(imageBytes);
          }
        }

        if (embeddedImage) {
          const maxDim = 50;
          const dims = embeddedImage.scaleToFit(maxDim, maxDim);
          page.drawImage(embeddedImage, {
            x: margin,
            y: y - dims.height + 15,
            width: dims.width,
            height: dims.height,
          });
          logoDrawn = true;
        }
      }
    } catch (err) {
      console.warn("Could not embed logo in PDF:", err);
    }
  }

  // 2. Business Header & Invoice Title
  const businessName = settings.businessName || "Local Ledger";
  const businessX = logoDrawn ? margin + 65 : margin;

  drawText(businessName, {
    x: businessX,
    y: 780,
    size: 16,
    bold: true,
    color: colorPrimary,
  });

  if (settings.businessAddress) {
    const addressLines = settings.businessAddress.split("\n").slice(0, 3);
    let addrY = 762;
    addressLines.forEach((line) => {
      drawText(line.trim(), { x: businessX, y: addrY, size: 8.5, color: colorMuted });
      addrY -= 11;
    });
  }

  // Top Right: "INVOICE" badge & number
  drawText("INVOICE", {
    x: margin + contentWidth,
    y: 780,
    size: 20,
    bold: true,
    color: colorPrimary,
    align: "right",
  });

  drawText(`#${invoice.invoiceNumber || "0001"}`, {
    x: margin + contentWidth,
    y: 762,
    size: 11,
    bold: true,
    color: colorDark,
    align: "right",
  });

  const statusLabel = (invoice.status || "draft").toUpperCase();
  drawText(`Status: ${statusLabel}`, {
    x: margin + contentWidth,
    y: 748,
    size: 8.5,
    bold: true,
    color: invoice.status === "paid" ? rgb(0.1, 0.6, 0.3) : colorMuted,
    align: "right",
  });

  // Divider Line
  y = 720;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 1,
    color: colorLightBorder,
  });

  // 3. Bill To & Invoice Meta Information
  y = 698;
  // Left: Bill To
  drawText("BILL TO", { x: margin, y, size: 8.5, bold: true, color: colorMuted });
  y -= 14;
  drawText(invoice.client?.name || "Untitled Client", {
    x: margin,
    y,
    size: 12,
    bold: true,
    color: colorDark,
  });

  if (invoice.client?.email) {
    y -= 12;
    drawText(invoice.client.email, { x: margin, y, size: 9, color: colorMuted });
  }

  if (invoice.client?.phone) {
    y -= 11;
    drawText(invoice.client.phone, { x: margin, y, size: 8.5, color: colorMuted });
  }

  if (invoice.client?.address) {
    const lines = invoice.client.address.split("\n").slice(0, 2);
    lines.forEach((line) => {
      y -= 11;
      drawText(line.trim(), { x: margin, y, size: 8.5, color: colorMuted });
    });
  }

  // Right: Dates Box
  const metaX = margin + contentWidth - 140;
  let metaY = 698;
  drawText("Issue Date:", { x: metaX, y: metaY, size: 9, color: colorMuted });
  drawText(shortDate(invoice.issueDate), {
    x: margin + contentWidth,
    y: metaY,
    size: 9,
    bold: true,
    align: "right",
  });

  metaY -= 14;
  drawText("Due Date:", { x: metaX, y: metaY, size: 9, color: colorMuted });
  drawText(shortDate(invoice.dueDate), {
    x: margin + contentWidth,
    y: metaY,
    size: 9,
    bold: true,
    align: "right",
  });

  metaY -= 14;
  drawText("Currency:", { x: metaX, y: metaY, size: 9, color: colorMuted });
  drawText(invoice.currency || "USD", {
    x: margin + contentWidth,
    y: metaY,
    size: 9,
    bold: true,
    align: "right",
  });

  // 4. Line Items Table
  y = 605;

  // Header background
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 22,
    color: colorTableHead,
  });

  const colDesc = margin + 10;
  const colQty = margin + 280;
  const colRate = margin + 370;
  const colAmount = margin + contentWidth - 10;

  drawText("DESCRIPTION", { x: colDesc, y: y + 2, size: 8, bold: true, color: colorMuted });
  drawText("QTY", { x: colQty + 20, y: y + 2, size: 8, bold: true, color: colorMuted, align: "right" });
  drawText("RATE", { x: colRate + 30, y: y + 2, size: 8, bold: true, color: colorMuted, align: "right" });
  drawText("AMOUNT", { x: colAmount, y: y + 2, size: 8, bold: true, color: colorMuted, align: "right" });

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 0.75,
    color: colorLightBorder,
  });

  // Items Rows
  const currency = invoice.currency || "USD";
  const subtotal = invoice.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const taxRate = invoice.taxRate ?? 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  for (const item of invoice.items) {
    y -= 22;
    const itemAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

    drawText(item.description || "Item", { x: colDesc, y, size: 9.5, color: colorDark });
    drawText(String(item.quantity || 1), {
      x: colQty + 20,
      y,
      size: 9.5,
      align: "right",
      color: colorDark,
    });
    drawText(money(item.rate || 0, currency), {
      x: colRate + 30,
      y,
      size: 9.5,
      align: "right",
      color: colorDark,
    });
    drawText(money(itemAmount, currency), {
      x: colAmount,
      y,
      size: 9.5,
      bold: true,
      align: "right",
      color: colorDark,
    });

    // Row divider
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: margin + contentWidth, y: y - 6 },
      thickness: 0.5,
      color: rgb(0.92, 0.93, 0.95),
    });
  }

  // 5. Totals Section
  y -= 20;
  const totalsBoxX = margin + contentWidth - 180;
  const totalsValX = margin + contentWidth - 10;

  drawText("Subtotal", { x: totalsBoxX, y, size: 9, color: colorMuted });
  drawText(money(subtotal, currency), { x: totalsValX, y, size: 9, bold: true, align: "right" });

  if (taxRate > 0) {
    y -= 14;
    drawText(`Tax (${taxRate}%)`, { x: totalsBoxX, y, size: 9, color: colorMuted });
    drawText(money(taxAmount, currency), { x: totalsValX, y, size: 9, bold: true, align: "right" });
  }

  y -= 10;
  page.drawLine({
    start: { x: totalsBoxX - 10, y },
    end: { x: margin + contentWidth, y },
    thickness: 1,
    color: colorPrimary,
  });

  y -= 16;
  drawText("Total Due", { x: totalsBoxX, y, size: 12, bold: true, color: colorPrimary });
  drawText(money(total, currency), {
    x: totalsValX,
    y,
    size: 13,
    bold: true,
    color: colorPrimary,
    align: "right",
  });

  // 6. Notes & Terms in Footer
  if (invoice.notes && invoice.notes.trim()) {
    y = Math.min(y - 45, 200);
    drawText("NOTES & PAYMENT TERMS", {
      x: margin,
      y,
      size: 8,
      bold: true,
      color: colorMuted,
    });

    const noteLines = invoice.notes.split("\n");
    let noteY = y - 12;
    noteLines.slice(0, 4).forEach((line) => {
      drawText(line.trim(), { x: margin, y: noteY, size: 8.5, color: colorMuted });
      noteY -= 11;
    });
  }

  // Bottom Branding Line / Watermark (Omitted for PRO users with hidePdfWatermark enabled)
  const showWatermark = !settings.isPro || settings.hidePdfWatermark === false;
  if (showWatermark) {
    page.drawLine({
      start: { x: margin, y: 40 },
      end: { x: margin + contentWidth, y: 40 },
      thickness: 0.5,
      color: colorLightBorder,
    });

    drawText("Made with Local Ledger · Offline-First Invoicing", {
      x: margin,
      y: 28,
      size: 7.5,
      color: colorMuted,
    });
  }

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export async function downloadInvoicePdf(invoice: FullInvoice, settings?: Settings) {
  const blob = await invoiceToPdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

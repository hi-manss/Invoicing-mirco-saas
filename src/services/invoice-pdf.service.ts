import type { Env } from "../types/env";
import { buildPdf, createPdfPage, type PdfLine, type PdfText, type PdfImage } from "../utils/pdf";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK", "CREDIT", "OTHER"];
const PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL", "FAILED", "REFUNDED"];
const PAGE_HEIGHT = 842;
const LEFT = 42;
const RIGHT = 553;
const ROW_HEIGHT = 18;
const MAX_ROWS = 30;

function money(paise: number): string { return `INR ${(paise / 100).toFixed(2)}`; }
function safe(value: unknown): string { return value == null ? "" : String(value); }
function truncate(value: string, max: number): string { return value.length > max ? `${value.slice(0, max - 3)}...` : value; }

function decodeJpegDataUrl(value: unknown): { bytes: Uint8Array; width: number; height: number } | undefined {
  if (typeof value !== "string" || !value.startsWith("data:image/jpeg;base64,")) return undefined;
  try {
    const bytes = Uint8Array.from(atob(value.slice("data:image/jpeg;base64,".length)), (char) => char.charCodeAt(0));
    for (let i = 0; i < bytes.length - 9; i++) {
      if (bytes[i] !== 0xff || (bytes[i + 1] !== 0xc0 && bytes[i + 1] !== 0xc1 && bytes[i + 1] !== 0xc2 && bytes[i + 1] !== 0xc3)) continue;
      return { bytes, height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
  } catch {}
  return undefined;
}

export async function generateInvoicePdf(env: Env, invoiceId: number): Promise<Uint8Array | null> {
  const invoice = await env.DB.prepare(`
    SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal_paise, i.gst_amount_paise,
           i.total_amount_paise, i.payment_method, i.payment_status,
           c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           c.address AS customer_address, c.gstin AS customer_gstin,
           u.name AS created_by_name,
           b.business_name, b.legal_name, b.address AS business_address, b.phone AS business_phone,
           b.email AS business_email, b.gstin AS business_gstin, b.state AS business_state,
           b.state_code AS business_state_code, b.logo_data_url
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN business_settings b ON b.id = 1
    WHERE i.id = ? AND i.is_deleted = 0
  `).bind(invoiceId).first<Record<string, unknown>>();
  if (!invoice) return null;

  const itemResult = await env.DB.prepare(`SELECT product_name, quantity, unit_price_paise, gst_rate, gst_amount_paise, line_total_paise FROM invoice_items WHERE invoice_id = ? AND is_deleted = 0 ORDER BY id`).bind(invoiceId).all<Record<string, unknown>>();
  const items = itemResult.results ?? [];
  const logo = decodeJpegDataUrl(invoice.logo_data_url);
  const pages: string[] = [];

  for (let pageStart = 0; pageStart < Math.max(items.length, 1); pageStart += MAX_ROWS) {
    const pageItems = items.slice(pageStart, pageStart + MAX_ROWS);
    const isLastPage = pageStart + pageItems.length >= items.length;
    const texts: PdfText[] = [];
    const lines: PdfLine[] = [];
    const images: PdfImage[] = [];

    if (logo) images.push({ bytes: logo.bytes, width: logo.width, height: logo.height, x: LEFT, y: 770, displayWidth: 58, displayHeight: Math.max(28, Math.min(58, 58 * logo.height / logo.width)) });
    const textX = logo ? 112 : LEFT;
    texts.push({ text: "TAX INVOICE", x: textX, y: 800, size: 20, bold: true });
    texts.push({ text: truncate(safe(invoice.business_name) || "Pharmaceutical Inventory & Billing", 40), x: textX, y: 777, size: 11, bold: true });
    if (invoice.business_address) texts.push({ text: truncate(safe(invoice.business_address), 58), x: textX, y: 761, size: 8.5 });
    if (invoice.business_phone || invoice.business_email) texts.push({ text: truncate([invoice.business_phone, invoice.business_email].filter(Boolean).join(" | "), 65), x: textX, y: 747, size: 8.5 });
    if (invoice.business_gstin) texts.push({ text: `GSTIN: ${truncate(safe(invoice.business_gstin), 24)}`, x: textX, y: 733, size: 8.5 });
    texts.push({ text: `Invoice: ${safe(invoice.invoice_number)}`, x: 390, y: 805, size: 10, bold: true });
    texts.push({ text: `Date: ${safe(invoice.invoice_date).slice(0, 10)}`, x: 390, y: 788, size: 10 });
    lines.push({ x1: LEFT, y1: 715, x2: RIGHT, y2: 715, width: 1.2 });

    texts.push({ text: `Bill To: ${truncate(safe(invoice.customer_name) || "Walk-in Customer", 42)}`, x: LEFT, y: 695, size: 11, bold: true });
    if (invoice.customer_phone) texts.push({ text: `Phone: ${truncate(safe(invoice.customer_phone), 28)}`, x: LEFT, y: 678, size: 9 });
    if (invoice.customer_email) texts.push({ text: `Email: ${truncate(safe(invoice.customer_email), 42)}`, x: LEFT, y: 662, size: 9 });
    if (invoice.customer_gstin) texts.push({ text: `GSTIN: ${truncate(safe(invoice.customer_gstin), 25)}`, x: 320, y: 678, size: 9 });
    if (invoice.customer_address) texts.push({ text: `Address: ${truncate(safe(invoice.customer_address), 55)}`, x: 320, y: 662, size: 9 });

    const tableTop = 635;
    const col = { product: 42, qty: 310, price: 355, gst: 430, total: 500 };
    lines.push({ x1: LEFT, y1: tableTop, x2: RIGHT, y2: tableTop, width: 1 });
    texts.push({ text: "Product", x: col.product, y: tableTop - 13, size: 9, bold: true });
    texts.push({ text: "Qty", x: col.qty, y: tableTop - 13, size: 9, bold: true });
    texts.push({ text: "Unit Price", x: col.price, y: tableTop - 13, size: 9, bold: true });
    texts.push({ text: "GST", x: col.gst, y: tableTop - 13, size: 9, bold: true });
    texts.push({ text: "Total", x: col.total, y: tableTop - 13, size: 9, bold: true });
    lines.push({ x1: LEFT, y1: tableTop - 22, x2: RIGHT, y2: tableTop - 22, width: 0.7 });
    pageItems.forEach((item, index) => {
      const y = tableTop - 39 - index * ROW_HEIGHT;
      texts.push({ text: truncate(safe(item.product_name), 38), x: col.product, y, size: 8.5 });
      texts.push({ text: safe(item.quantity), x: col.qty, y, size: 8.5 });
      texts.push({ text: money(Number(item.unit_price_paise)), x: col.price, y, size: 8.5 });
      texts.push({ text: `${safe(item.gst_rate)}%`, x: col.gst, y, size: 8.5 });
      texts.push({ text: money(Number(item.line_total_paise)), x: col.total, y, size: 8.5 });
    });

    if (isLastPage) {
      const totalsY = Math.max(90, tableTop - 55 - pageItems.length * ROW_HEIGHT);
      lines.push({ x1: 335, y1: totalsY + 20, x2: RIGHT, y2: totalsY + 20, width: 0.8 });
      texts.push({ text: "Subtotal", x: 395, y: totalsY, size: 10 }); texts.push({ text: money(Number(invoice.subtotal_paise)), x: 500, y: totalsY, size: 10 });
      texts.push({ text: "GST", x: 395, y: totalsY - 17, size: 10 }); texts.push({ text: money(Number(invoice.gst_amount_paise)), x: 500, y: totalsY - 17, size: 10 });
      texts.push({ text: "Grand Total", x: 395, y: totalsY - 38, size: 12, bold: true }); texts.push({ text: money(Number(invoice.total_amount_paise)), x: 490, y: totalsY - 38, size: 12, bold: true });
      texts.push({ text: `Payment: ${PAYMENT_METHODS[Number(invoice.payment_method)] ?? "OTHER"}`, x: LEFT, y: totalsY - 5, size: 10 });
      texts.push({ text: `Status: ${PAYMENT_STATUSES[Number(invoice.payment_status)] ?? "PENDING"}`, x: LEFT, y: totalsY - 22, size: 10 });
      texts.push({ text: `Created by: ${truncate(safe(invoice.created_by_name), 35)}`, x: LEFT, y: totalsY - 39, size: 9 });
      texts.push({ text: "This invoice was generated electronically from the billing database.", x: LEFT, y: 58, size: 8 });
    }
    texts.push({ text: `Page ${pages.length + 1}`, x: 515, y: 40, size: 8 });
    pages.push(createPdfPage(texts, lines, images));
  }
  return buildPdf(pages, logo);
}

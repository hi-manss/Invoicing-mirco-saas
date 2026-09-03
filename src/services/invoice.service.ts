import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { customers, products } from "../db/schema";
import type { Env } from "../types/env";

export type InvoiceInputItem = { productId: number; quantity: number };
export type CreateInvoiceInput = { customerId?: number | null; invoiceDate?: string; paymentMethod?: number; paymentStatus?: number; items: InvoiceInputItem[] };
type PreparedItem = { productId: number; productName: string; quantity: number; unitPricePaise: number; gstRate: number; gstAmountPaise: number; lineTotalPaise: number; stockQuantity: number };

export async function createInvoice(env: Env, createdBy: number, input: CreateInvoiceInput) {
  if (!input.items.length) throw new Error("At least one invoice item is required");
  const productIds = input.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) throw new Error("Each product can appear only once");
  const db = drizzle(env.DB);
  const productRows = await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.isDeleted, false)));
  if (productRows.length !== productIds.length) throw new Error("One or more products were not found");
  if (input.customerId != null) {
    const customer = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.isDeleted, false))).limit(1);
    if (!customer.length) throw new Error("Customer not found");
  }
  const byId = new Map(productRows.map((product) => [product.id, product]));
  const prepared: PreparedItem[] = [];
  let subtotalPaise = 0, gstAmountPaise = 0;
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Quantity must be a positive integer");
    const product = byId.get(item.productId);
    if (!product) throw new Error("Product not found");
    if (product.stockQuantity < item.quantity) throw new Error(`Insufficient stock for product: ${product.name}`);
    const lineSubtotal = product.sellingPricePaise * item.quantity;
    const lineGst = Math.round((lineSubtotal * product.gstRate) / 100);
    subtotalPaise += lineSubtotal; gstAmountPaise += lineGst;
    prepared.push({ productId: product.id, productName: product.name, quantity: item.quantity, unitPricePaise: product.sellingPricePaise, gstRate: product.gstRate, gstAmountPaise: lineGst, lineTotalPaise: lineSubtotal + lineGst, stockQuantity: product.stockQuantity });
  }
  const paymentMethod = input.paymentMethod ?? 0, paymentStatus = input.paymentStatus ?? 0;
  if (![0, 1, 2, 3, 4].includes(paymentMethod)) throw new Error("Invalid payment method");
  if (![0, 1, 2, 3, 4].includes(paymentStatus)) throw new Error("Invalid payment status");
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const invoiceDate = input.invoiceDate ?? new Date().toISOString();
  const totalAmountPaise = subtotalPaise + gstAmountPaise;
  const statements: D1PreparedStatement[] = [env.DB.prepare(`INSERT INTO invoices (invoice_number, customer_id, invoice_date, subtotal_paise, gst_amount_paise, total_amount_paise, payment_method, payment_status, created_by, is_deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`).bind(invoiceNumber, input.customerId ?? null, invoiceDate, subtotalPaise, gstAmountPaise, totalAmountPaise, paymentMethod, paymentStatus, createdBy)];
  for (const item of prepared) {
    statements.push(env.DB.prepare(`INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_paise, gst_rate, gst_amount_paise, line_total_paise, is_deleted) VALUES ((SELECT id FROM invoices WHERE invoice_number = ?), ?, ?, ?, ?, ?, ?, ?, 0)`).bind(invoiceNumber, item.productId, item.productName, item.quantity, item.unitPricePaise, item.gstRate, item.gstAmountPaise, item.lineTotalPaise));
    statements.push(env.DB.prepare(`UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0 AND stock_quantity = ?`).bind(item.quantity, item.productId, item.stockQuantity));
    statements.push(env.DB.prepare(`INSERT INTO inventory_movements (product_id, invoice_id, user_id, movement_type, quantity_change, stock_before, stock_after, reason) SELECT ?, (SELECT id FROM invoices WHERE invoice_number = ?), ?, 1, ?, ?, ?, ?`).bind(item.productId, invoiceNumber, createdBy, -item.quantity, item.stockQuantity, item.stockQuantity - item.quantity, `Sale: ${invoiceNumber}`));
  }
  const results = await env.DB.batch(statements);
  for (let i = 1; i < results.length; i += 3) {
    const stockResult = results[i + 1];
    if (!stockResult?.success || (stockResult.meta.changes ?? 0) !== 1) throw new Error("Stock changed while creating invoice; nothing was committed");
  }
  const invoice = await env.DB.prepare("SELECT id, invoice_number FROM invoices WHERE invoice_number = ? AND is_deleted = 0").bind(invoiceNumber).first<{ id: number; invoice_number: string }>();
  if (!invoice) throw new Error("Invoice was created but could not be loaded");
  return { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}

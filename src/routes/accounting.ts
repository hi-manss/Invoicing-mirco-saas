import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, requireAdmin } from "../middleware/auth";

const accountingRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();
accountingRoutes.use("*", requireAuth, requireAdmin);

accountingRoutes.get("/receivables", async c => {
  const rows = await c.env.DB.prepare(`SELECT c.id,c.name,c.phone,c.gstin,c.credit_limit_paise,c.credit_period_days,COALESCE(SUM(CASE WHEN i.invoice_status=0 AND i.payment_status=0 THEN i.total_amount_paise ELSE 0 END),0) AS outstanding_paise,COALESCE(COUNT(CASE WHEN i.invoice_status=0 AND i.payment_status=0 THEN 1 END),0) AS open_invoices FROM customers c LEFT JOIN invoices i ON i.customer_id=c.id AND i.is_deleted=0 WHERE c.is_deleted=0 GROUP BY c.id ORDER BY outstanding_paise DESC`).all();
  return c.json({ receivables: rows.results });
});

accountingRoutes.get("/summary", async c => {
  const totals = await c.env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN invoice_status=0 THEN total_amount_paise ELSE 0 END),0) AS sales_paise,COALESCE(SUM(CASE WHEN invoice_status=0 AND payment_status=0 THEN total_amount_paise ELSE 0 END),0) AS outstanding_paise,COALESCE(SUM(CASE WHEN invoice_status=0 AND payment_status=1 THEN total_amount_paise ELSE 0 END),0) AS paid_paise,COUNT(CASE WHEN invoice_status=0 THEN 1 END) AS invoice_count FROM invoices WHERE is_deleted=0`).first();
  const stock = await c.env.DB.prepare(`SELECT COUNT(*) AS products,COALESCE(SUM(stock_quantity),0) AS units,COUNT(CASE WHEN stock_quantity<=reorder_level THEN 1 END) AS low_stock FROM products WHERE is_deleted=0`).first();
  return c.json({ summary: { ...(totals || {}), ...(stock || {}) } });
});

export default accountingRoutes;

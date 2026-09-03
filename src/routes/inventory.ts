import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { adjustStock } from "../services/inventory.service";

const inventoryRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();
inventoryRoutes.use("*", requireAuth, requireAdmin);

inventoryRoutes.post("/adjust", async (c) => {
  try {
    const body = await c.req.json<{ productId?: number; quantityChange?: number; reason?: string }>();
    if (!Number.isInteger(body.productId) || !Number.isInteger(body.quantityChange) || !body.reason?.trim()) return c.json({ error: "productId, quantityChange and reason are required" }, 400);
    const result = await adjustStock(c.env, c.get("user").id, body.productId, body.quantityChange, body.reason);
    return c.json({ message: body.quantityChange > 0 ? "Stock added" : "Stock removed", ...result });
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : "Failed to adjust stock" }, 400); }
});

inventoryRoutes.get("/movements", async (c) => {
  const rawPage = Number(c.req.query("page") || 1), rawLimit = Number(c.req.query("limit") || 50);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
  const productId = Number(c.req.query("productId"));
  const hasProduct = Number.isInteger(productId) && productId > 0;
  const offset = (page - 1) * limit;
  const sql = hasProduct ? "SELECT im.*, p.name AS product_name, p.sku AS product_sku FROM inventory_movements im JOIN products p ON p.id = im.product_id WHERE im.product_id = ? ORDER BY im.id DESC LIMIT ? OFFSET ?" : "SELECT im.*, p.name AS product_name, p.sku AS product_sku FROM inventory_movements im JOIN products p ON p.id = im.product_id ORDER BY im.id DESC LIMIT ? OFFSET ?";
  const result = await c.env.DB.prepare(sql).bind(...(hasProduct ? [productId, limit, offset] : [limit, offset])).all();
  const countSql = hasProduct ? "SELECT COUNT(*) AS total FROM inventory_movements WHERE product_id = ?" : "SELECT COUNT(*) AS total FROM inventory_movements";
  const count = await c.env.DB.prepare(countSql).bind(...(hasProduct ? [productId] : [])).first<{ total: number }>();
  const total = count?.total ?? 0;
  return c.json({ movements: result.results, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export default inventoryRoutes;

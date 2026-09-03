import { Hono } from "hono";
import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types/env";
import { products } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const productRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();

function getPagination(c: any) {
  const rawPage = Number(c.req.query("page") || 1);
  const rawLimit = Number(c.req.query("limit") || 20);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

productRoutes.get("/", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const { page, limit, offset } = getPagination(c);
  const search = c.req.query("search")?.trim();
  const where = search ? and(eq(products.isDeleted, false), or(like(products.name, `%${search}%`), like(products.sku, `%${search}%`))) : eq(products.isDeleted, false);
  const result = await db.select().from(products).where(where).orderBy(desc(products.id)).limit(limit).offset(offset);
  const countResult = await c.env.DB.prepare(search ? "SELECT COUNT(*) AS total FROM products WHERE is_deleted = 0 AND (name LIKE ? OR sku LIKE ?)" : "SELECT COUNT(*) AS total FROM products WHERE is_deleted = 0").bind(...(search ? [`%${search}%`, `%${search}%`] : [])).first<{ total: number }>();
  const total = countResult?.total ?? 0;
  return c.json({ products: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

productRoutes.get("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid product ID" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.isDeleted, false))).limit(1);
  if (!result.length) return c.json({ error: "Product not found" }, 404);
  return c.json({ product: result[0] });
});

productRoutes.post("/", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ name?: string; sku?: string; hsnCode?: string; unit?: string; sellingPricePaise?: number; gstRate?: number; stockQuantity?: number }>();
  if (!body.name?.trim() || !body.sku?.trim()) return c.json({ error: "Name and SKU are required" }, 400);
  if (body.sellingPricePaise === undefined || !Number.isInteger(body.sellingPricePaise) || body.sellingPricePaise < 0) return c.json({ error: "sellingPricePaise must be a non-negative integer" }, 400);
  const gstRate = body.gstRate ?? 0, stockQuantity = body.stockQuantity ?? 0;
  if (!Number.isInteger(gstRate) || gstRate < 0 || gstRate > 100) return c.json({ error: "GST rate must be between 0 and 100" }, 400);
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return c.json({ error: "Stock quantity must be a non-negative integer" }, 400);
  const db = drizzle(c.env.DB);
  try { const result = await db.insert(products).values({ name: body.name.trim(), sku: body.sku.trim(), hsnCode: body.hsnCode?.trim() || null, unit: body.unit?.trim() || "PCS", sellingPricePaise: body.sellingPricePaise, gstRate, stockQuantity, isDeleted: false }).returning(); return c.json({ message: "Product created", product: result[0] }, 201); } catch { return c.json({ error: "SKU already exists" }, 409); }
});

productRoutes.put("/:id", requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid product ID" }, 400);
  const body = await c.req.json<{ name?: string; sku?: string; hsnCode?: string | null; unit?: string; sellingPricePaise?: number; gstRate?: number; stockQuantity?: number }>();
  const updateData: Partial<typeof products.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) { if (!body.name.trim()) return c.json({ error: "Name cannot be empty" }, 400); updateData.name = body.name.trim(); }
  if (body.sku !== undefined) { if (!body.sku.trim()) return c.json({ error: "SKU cannot be empty" }, 400); updateData.sku = body.sku.trim(); }
  if (body.hsnCode !== undefined) updateData.hsnCode = body.hsnCode?.trim() || null;
  if (body.unit !== undefined) updateData.unit = body.unit.trim() || "PCS";
  if (body.sellingPricePaise !== undefined) { if (!Number.isInteger(body.sellingPricePaise) || body.sellingPricePaise < 0) return c.json({ error: "sellingPricePaise must be a non-negative integer" }, 400); updateData.sellingPricePaise = body.sellingPricePaise; }
  if (body.gstRate !== undefined) { if (!Number.isInteger(body.gstRate) || body.gstRate < 0 || body.gstRate > 100) return c.json({ error: "GST rate must be between 0 and 100" }, 400); updateData.gstRate = body.gstRate; }
  if (body.stockQuantity !== undefined) { if (!Number.isInteger(body.stockQuantity) || body.stockQuantity < 0) return c.json({ error: "Stock quantity must be a non-negative integer" }, 400); updateData.stockQuantity = body.stockQuantity; }
  const db = drizzle(c.env.DB);
  try { const result = await db.update(products).set(updateData).where(and(eq(products.id, id), eq(products.isDeleted, false))).returning(); if (!result.length) return c.json({ error: "Product not found" }, 404); return c.json({ message: "Product updated", product: result[0] }); } catch { return c.json({ error: "SKU already exists" }, 409); }
});

productRoutes.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid product ID" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.update(products).set({ isDeleted: true, updatedAt: new Date().toISOString() }).where(and(eq(products.id, id), eq(products.isDeleted, false))).returning({ id: products.id, name: products.name, isDeleted: products.isDeleted });
  if (!result.length) return c.json({ error: "Product not found" }, 404);
  return c.json({ message: "Product deleted", product: result[0] });
});

export default productRoutes;

import { Hono } from "hono";
import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types/env";
import { customers } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const customerRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();

function getPagination(c: any) {
  const rawPage = Number(c.req.query("page") || 1), rawLimit = Number(c.req.query("limit") || 20);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

customerRoutes.get("/", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const { page, limit, offset } = getPagination(c);
  const search = c.req.query("search")?.trim();
  const where = search ? and(eq(customers.isDeleted, false), or(like(customers.name, `%${search}%`), like(customers.phone, `%${search}%`))) : eq(customers.isDeleted, false);
  const result = await db.select().from(customers).where(where).orderBy(desc(customers.id)).limit(limit).offset(offset);
  const count = await c.env.DB.prepare(search ? "SELECT COUNT(*) AS total FROM customers WHERE is_deleted = 0 AND (name LIKE ? OR phone LIKE ?)" : "SELECT COUNT(*) AS total FROM customers WHERE is_deleted = 0").bind(...(search ? [`%${search}%`, `%${search}%`] : [])).first<{ total: number }>();
  const total = count?.total ?? 0;
  return c.json({ customers: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

customerRoutes.get("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid customer ID" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.isDeleted, false))).limit(1);
  if (!result.length) return c.json({ error: "Customer not found" }, 404);
  return c.json({ customer: result[0] });
});

customerRoutes.post("/", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string; email?: string; address?: string; gstin?: string }>();
  if (!body.name?.trim()) return c.json({ error: "Customer name is required" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.insert(customers).values({ name: body.name.trim(), phone: body.phone?.trim() || null, email: body.email?.trim() || null, address: body.address?.trim() || null, gstin: body.gstin?.trim().toUpperCase() || null, isDeleted: false }).returning();
  return c.json({ message: "Customer created", customer: result[0] }, 201);
});

customerRoutes.put("/:id", requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid customer ID" }, 400);
  const body = await c.req.json<{ name?: string; phone?: string | null; email?: string | null; address?: string | null; gstin?: string | null }>();
  const updateData: Partial<typeof customers.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) { if (!body.name.trim()) return c.json({ error: "Customer name cannot be empty" }, 400); updateData.name = body.name.trim(); }
  if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
  if (body.email !== undefined) updateData.email = body.email?.trim() || null;
  if (body.address !== undefined) updateData.address = body.address?.trim() || null;
  if (body.gstin !== undefined) updateData.gstin = body.gstin?.trim().toUpperCase() || null;
  const db = drizzle(c.env.DB);
  const result = await db.update(customers).set(updateData).where(and(eq(customers.id, id), eq(customers.isDeleted, false))).returning();
  if (!result.length) return c.json({ error: "Customer not found" }, 404);
  return c.json({ message: "Customer updated", customer: result[0] });
});

customerRoutes.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid customer ID" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.update(customers).set({ isDeleted: true, updatedAt: new Date().toISOString() }).where(and(eq(customers.id, id), eq(customers.isDeleted, false))).returning({ id: customers.id, name: customers.name, isDeleted: customers.isDeleted });
  if (!result.length) return c.json({ error: "Customer not found" }, 404);
  return c.json({ message: "Customer deleted", customer: result[0] });
});

export default customerRoutes;

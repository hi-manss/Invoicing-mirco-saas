import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Env } from "../types/env";
import { customers } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

const customerRoutes = new Hono<{
  Bindings: Env;
  Variables: {
    user: {
      id: number;
      name: string;
      email: string;
      role: number;
    };
  };
}>();

customerRoutes.get("/", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.id));

  return c.json({ customers: result });
});

customerRoutes.get("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid customer ID" }, 400);
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Customer not found" }, 404);
  }

  return c.json({ customer: result[0] });
});

customerRoutes.post(
  "/",
  requireAuth,
  requireAdmin,
  async (c) => {
    const body = await c.req.json<{
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      gstin?: string;
    }>();

    if (!body.name?.trim()) {
      return c.json(
        { error: "Customer name is required" },
        400
      );
    }

    const db = drizzle(c.env.DB);

    const result = await db
      .insert(customers)
      .values({
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        gstin: body.gstin?.trim().toUpperCase() || null
      })
      .returning();

    return c.json(
      {
        message: "Customer created",
        customer: result[0]
      },
      201
    );
  }
);

customerRoutes.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (c) => {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id)) {
      return c.json({ error: "Invalid customer ID" }, 400);
    }

    const body = await c.req.json<{
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      gstin?: string | null;
    }>();

    const updateData: Partial<
      typeof customers.$inferInsert
    > = {
      updatedAt: new Date().toISOString()
    };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return c.json(
          { error: "Customer name cannot be empty" },
          400
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      updateData.phone =
        body.phone?.trim() || null;
    }

    if (body.email !== undefined) {
      updateData.email =
        body.email?.trim() || null;
    }

    if (body.address !== undefined) {
      updateData.address =
        body.address?.trim() || null;
    }

    if (body.gstin !== undefined) {
      updateData.gstin =
        body.gstin?.trim().toUpperCase() || null;
    }

    const db = drizzle(c.env.DB);

    const result = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    if (result.length === 0) {
      return c.json(
        { error: "Customer not found" },
        404
      );
    }

    return c.json({
      message: "Customer updated",
      customer: result[0]
    });
  }
);

customerRoutes.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (c) => {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id)) {
      return c.json({ error: "Invalid customer ID" }, 400);
    }

    const db = drizzle(c.env.DB);

    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning({
        id: customers.id
      });

    if (result.length === 0) {
      return c.json(
        { error: "Customer not found" },
        404
      );
    }

    return c.json({
      message: "Customer deleted"
    });
  }
);

export default customerRoutes;
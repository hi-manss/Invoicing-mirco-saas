import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Env } from "../types/env";
import { products } from "../db/schema";
import {
  requireAuth,
  requireAdmin
} from "../middleware/auth";

const productRoutes = new Hono<{
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

/*
 * Everyone authenticated can view products.
 */
productRoutes.get("/", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.id));

  return c.json({
    products: result
  });
});

/*
 * Get one product.
 */
productRoutes.get("/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json(
      { error: "Invalid product ID" },
      400
    );
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.isActive, true)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return c.json(
      { error: "Product not found" },
      404
    );
  }

  return c.json({
    product: result[0]
  });
});

/*
 * Create product.
 * ADMIN only.
 */
productRoutes.post(
  "/",
  requireAuth,
  requireAdmin,
  async (c) => {
    const body = await c.req.json<{
      name?: string;
      sku?: string;
      hsnCode?: string;
      unit?: string;
      sellingPricePaise?: number;
      gstRate?: number;
      stockQuantity?: number;
    }>();

    if (!body.name || !body.sku) {
      return c.json(
        {
          error: "Name and SKU are required"
        },
        400
      );
    }

    if (
      body.sellingPricePaise === undefined ||
      !Number.isInteger(body.sellingPricePaise) ||
      body.sellingPricePaise < 0
    ) {
      return c.json(
        {
          error:
            "sellingPricePaise must be a non-negative integer"
        },
        400
      );
    }

    const gstRate = body.gstRate ?? 0;
    const stockQuantity = body.stockQuantity ?? 0;

    if (
      !Number.isInteger(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      return c.json(
        {
          error: "GST rate must be between 0 and 100"
        },
        400
      );
    }

    if (
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      return c.json(
        {
          error:
            "Stock quantity must be a non-negative integer"
        },
        400
      );
    }

    const db = drizzle(c.env.DB);

    try {
      const result = await db
        .insert(products)
        .values({
          name: body.name.trim(),
          sku: body.sku.trim(),
          hsnCode: body.hsnCode?.trim() || null,
          unit: body.unit?.trim() || "PCS",
          sellingPricePaise: body.sellingPricePaise,
          gstRate,
          stockQuantity,
          isActive: true
        })
        .returning();

      return c.json(
        {
          message: "Product created",
          product: result[0]
        },
        201
      );
    } catch {
      return c.json(
        {
          error: "SKU already exists"
        },
        409
      );
    }
  }
);

/*
 * Update product.
 * ADMIN only.
 */
productRoutes.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (c) => {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id)) {
      return c.json(
        { error: "Invalid product ID" },
        400
      );
    }

    const body = await c.req.json<{
      name?: string;
      sku?: string;
      hsnCode?: string | null;
      unit?: string;
      sellingPricePaise?: number;
      gstRate?: number;
      stockQuantity?: number;
    }>();

    const updateData: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date().toISOString()
    };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return c.json(
          { error: "Name cannot be empty" },
          400
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.sku !== undefined) {
      if (!body.sku.trim()) {
        return c.json(
          { error: "SKU cannot be empty" },
          400
        );
      }

      updateData.sku = body.sku.trim();
    }

    if (body.hsnCode !== undefined) {
      updateData.hsnCode =
        body.hsnCode?.trim() || null;
    }

    if (body.unit !== undefined) {
      updateData.unit =
        body.unit.trim() || "PCS";
    }

    if (
      body.sellingPricePaise !== undefined
    ) {
      if (
        !Number.isInteger(
          body.sellingPricePaise
        ) ||
        body.sellingPricePaise < 0
      ) {
        return c.json(
          {
            error:
              "sellingPricePaise must be a non-negative integer"
          },
          400
        );
      }

      updateData.sellingPricePaise =
        body.sellingPricePaise;
    }

    if (body.gstRate !== undefined) {
      if (
        !Number.isInteger(body.gstRate) ||
        body.gstRate < 0 ||
        body.gstRate > 100
      ) {
        return c.json(
          {
            error:
              "GST rate must be between 0 and 100"
          },
          400
        );
      }

      updateData.gstRate = body.gstRate;
    }

    if (
      body.stockQuantity !== undefined
    ) {
      if (
        !Number.isInteger(
          body.stockQuantity
        ) ||
        body.stockQuantity < 0
      ) {
        return c.json(
          {
            error:
              "Stock quantity must be a non-negative integer"
          },
          400
        );
      }

      updateData.stockQuantity =
        body.stockQuantity;
    }

    const db = drizzle(c.env.DB);

    try {
      const result = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      if (result.length === 0) {
        return c.json(
          { error: "Product not found" },
          404
        );
      }

      return c.json({
        message: "Product updated",
        product: result[0]
      });
    } catch {
      return c.json(
        {
          error: "SKU already exists"
        },
        409
      );
    }
  }
);

/*
 * Soft delete product.
 * ADMIN only.
 *
 * We don't physically delete it because
 * invoice_items may reference this product.
 */
productRoutes.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (c) => {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id)) {
      return c.json(
        { error: "Invalid product ID" },
        400
      );
    }

    const db = drizzle(c.env.DB);

    const result = await db
      .update(products)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, id))
      .returning({
        id: products.id,
        name: products.name,
        isActive: products.isActive
      });

    if (result.length === 0) {
      return c.json(
        { error: "Product not found" },
        404
      );
    }

    return c.json({
      message: "Product deleted",
      product: result[0]
    });
  }
);

export default productRoutes;
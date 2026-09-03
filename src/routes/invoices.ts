import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types/env";
import { invoiceItems, invoices } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { createInvoice } from "../services/invoice.service";
import { generateInvoicePdf } from "../services/invoice-pdf.service";

const invoiceRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();
invoiceRoutes.use("*", requireAuth);

invoiceRoutes.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(invoices).where(eq(invoices.isDeleted, false)).orderBy(desc(invoices.id));
  return c.json({ invoices: result });
});

invoiceRoutes.get("/:id/pdf", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid invoice ID" }, 400);
  const pdf = await generateInvoicePdf(c.env, id);
  if (!pdf) return c.json({ error: "Invoice not found" }, 404);

  const invoice = await c.env.DB.prepare("SELECT invoice_number FROM invoices WHERE id = ? AND is_deleted = 0")
    .bind(id)
    .first<{ invoice_number: string }>();

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice?.invoice_number ?? `invoice-${id}`}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
});

invoiceRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid invoice ID" }, 400);
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.isDeleted, false))).limit(1);
  if (!invoice.length) return c.json({ error: "Invoice not found" }, 404);
  const items = await db.select().from(invoiceItems).where(and(eq(invoiceItems.invoiceId, id), eq(invoiceItems.isDeleted, false)));
  return c.json({ invoice: invoice[0], items });
});

invoiceRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json<{ customerId?: number | null; invoiceDate?: string; paymentMethod?: number; paymentStatus?: number; items?: { productId: number; quantity: number }[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: "items are required" }, 400);
    const result = await createInvoice(c.env, c.get("user").id, { ...body, items: body.items });
    return c.json({ message: "Invoice created", ...result }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Failed to create invoice" }, 400);
  }
});

invoiceRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid invoice ID" }, 400);
  const db = drizzle(c.env.DB);
  const result = await db.update(invoices).set({ isDeleted: true, updatedAt: new Date().toISOString() }).where(and(eq(invoices.id, id), eq(invoices.isDeleted, false))).returning({ id: invoices.id });
  if (!result.length) return c.json({ error: "Invoice not found" }, 404);
  return c.json({ message: "Invoice deleted" });
});

export default invoiceRoutes;

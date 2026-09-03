import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAdmin, requireAuth } from "../middleware/auth";

const businessRoutes = new Hono<{ Bindings: Env; Variables: { user: { id: number; name: string; email: string; role: number } } }>();

businessRoutes.use("*", requireAuth);

businessRoutes.get("/", async (c) => {
  const business = await c.env.DB.prepare("SELECT id, business_name, legal_name, address, phone, email, gstin, state, state_code, invoice_prefix, logo_data_url, updated_at FROM business_settings WHERE id = 1").first();
  return c.json({ business });
});

businessRoutes.put("/", requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{
      businessName?: string;
      legalName?: string;
      address?: string;
      phone?: string;
      email?: string;
      gstin?: string;
      state?: string;
      stateCode?: string;
      invoicePrefix?: string;
      logoDataUrl?: string | null;
    }>();

    const businessName = String(body.businessName || "").trim();
    if (!businessName) return c.json({ error: "Business name is required" }, 400);
    const invoicePrefix = String(body.invoicePrefix || "INV").trim().toUpperCase().slice(0, 12) || "INV";
    const logo = body.logoDataUrl == null ? null : String(body.logoDataUrl);
    if (logo && (!logo.startsWith("data:image/jpeg;base64,") || logo.length > 700_000)) {
      return c.json({ error: "Logo must be a JPEG image smaller than 500 KB" }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE business_settings SET
        business_name = ?, legal_name = ?, address = ?, phone = ?, email = ?,
        gstin = ?, state = ?, state_code = ?, invoice_prefix = ?, logo_data_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(
      businessName,
      String(body.legalName || "").trim() || null,
      String(body.address || "").trim() || null,
      String(body.phone || "").trim() || null,
      String(body.email || "").trim() || null,
      String(body.gstin || "").trim() || null,
      String(body.state || "").trim() || null,
      String(body.stateCode || "").trim() || null,
      invoicePrefix,
      logo,
    ).run();

    const business = await c.env.DB.prepare("SELECT id, business_name, legal_name, address, phone, email, gstin, state, state_code, invoice_prefix, logo_data_url, updated_at FROM business_settings WHERE id = 1").first();
    return c.json({ message: "Business details saved", business });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Failed to save business details" }, 400);
  }
});

export default businessRoutes;

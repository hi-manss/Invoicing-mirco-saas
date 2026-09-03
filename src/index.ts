import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import auth from "./routes/auth";
import admin from "./routes/admin";
import products from "./routes/products";
import customers from "./routes/customers";
import invoices from "./routes/invoices";
import inventory from "./routes/inventory";
import business from "./routes/business";
import { ensureBootstrapAdmin } from "./services/bootstrap.service";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors({
  origin: (origin) => origin || "http://localhost:5173",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  credentials: true,
}));

app.get("/", (c) => c.json({ message: "Invoicing API is running" }));
app.get("/api/health", async (c) => {
  const result = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", database: result?.ok === 1 });
});
app.use("*", async (c, next) => { await ensureBootstrapAdmin(c.env); await next(); });
app.route("/api/auth", auth);
app.route("/api/admin", admin);
app.route("/api/business", business);
app.route("/api/products", products);
app.route("/api/customers", customers);
app.route("/api/invoices", invoices);
app.route("/api/inventory", inventory);
export default app;

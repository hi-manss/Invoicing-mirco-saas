import { Hono } from "hono";

import type { Env } from "./types/env";

import auth from "./routes/auth";
import admin from "./routes/admin";
import products from "./routes/products";

import {
  ensureBootstrapAdmin
} from "./services/bootstrap.service";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({
    message: "Invoicing API is running"
  });
});

app.get("/api/health", async (c) => {
  const result = await c.env.DB
    .prepare("SELECT 1 AS ok")
    .first<{ ok: number }>();

  return c.json({
    status: "ok",
    database: result?.ok === 1
  });
});

app.use("*", async (c, next) => {
  await ensureBootstrapAdmin(c.env);
  await next();
});

app.route("/api/auth", auth);
app.route("/api/admin", admin);
app.route("/api/products", products);

export default app;
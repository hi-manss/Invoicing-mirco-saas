import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Env } from "../types/env";
import { users } from "../db/schema";
import { createUser } from "../services/auth.service";
import {
  requireAuth,
  requireAdmin
} from "../middleware/auth";

const admin = new Hono<{
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

admin.use("*", requireAuth);
admin.use("*", requireAdmin);

admin.get("/users", async (c) => {
  const db = drizzle(c.env.DB);

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isDeleted: users.isDeleted,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.isDeleted, false))
    .orderBy(desc(users.id));

  return c.json({ users: result });
});

admin.post("/users", async (c) => {
  const body = await c.req.json<{
    name?: string;
    email?: string;
    password?: string;
    role?: number;
  }>();

  if (!body.name || !body.email || !body.password) {
    return c.json(
      { error: "Name, email and password are required" },
      400
    );
  }

  if (
    body.role !== undefined &&
    body.role !== 0 &&
    body.role !== 1
  ) {
    return c.json({ error: "Role must be 0 or 1" }, 400);
  }

  if (body.password.length < 8) {
    return c.json(
      { error: "Password must be at least 8 characters" },
      400
    );
  }

  try {
    const user = await createUser(
      c.env,
      body.name,
      body.email,
      body.password,
      body.role ?? 0
    );

    return c.json(
      { message: "User created", user },
      201
    );
  } catch {
    return c.json(
      { error: "Email already exists" },
      409
    );
  }
});

admin.put("/users/:id/status", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const body = await c.req.json<{
    isDeleted?: boolean;
  }>();

  if (typeof body.isDeleted !== "boolean") {
    return c.json(
      { error: "isDeleted must be boolean" },
      400
    );
  }

  if (body.isDeleted === false) {
    return c.json(
      { error: "Use restore endpoint to restore a deleted user" },
      400
    );
  }

  const currentUser = c.get("user");

  if (currentUser.id === id) {
    return c.json(
      { error: "You cannot delete your own account" },
      400
    );
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .update(users)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(users.id, id),
        eq(users.isDeleted, false)
      )
    )
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isDeleted: users.isDeleted
    });

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    message: "User deleted",
    user: result[0]
  });
});

admin.delete("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const currentUser = c.get("user");

  if (currentUser.id === id) {
    return c.json(
      { error: "You cannot delete your own account" },
      400
    );
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .update(users)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(users.id, id),
        eq(users.isDeleted, false)
      )
    )
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isDeleted: users.isDeleted
    });

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    message: "User deleted",
    user: result[0]
  });
});

admin.post("/users/:id/restore", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .update(users)
    .set({
      isDeleted: false,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(users.id, id),
        eq(users.isDeleted, true)
      )
    )
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isDeleted: users.isDeleted
    });

  if (result.length === 0) {
    return c.json({ error: "Deleted user not found" }, 404);
  }

  return c.json({
    message: "User restored",
    user: result[0]
  });
});

export default admin;

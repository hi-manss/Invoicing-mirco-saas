import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
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

/**
 * GET /api/admin/users
 */
admin.get("/users", async (c) => {
  const db = drizzle(c.env.DB);

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.id));

  return c.json({
    users: result
  });
});

/**
 * POST /api/admin/users
 */
admin.post("/users", async (c) => {
  const body = await c.req.json<{
    name?: string;
    email?: string;
    password?: string;
    role?: number;
  }>();

  if (
    !body.name ||
    !body.email ||
    !body.password
  ) {
    return c.json(
      {
        error:
          "Name, email and password are required"
      },
      400
    );
  }

  if (
    body.role !== undefined &&
    body.role !== 0 &&
    body.role !== 1
  ) {
    return c.json(
      {
        error: "Role must be 0 or 1"
      },
      400
    );
  }

  if (body.password.length < 8) {
    return c.json(
      {
        error:
          "Password must be at least 8 characters"
      },
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
      {
        message: "User created",
        user
      },
      201
    );
  } catch {
    return c.json(
      {
        error: "Email already exists"
      },
      409
    );
  }
});

/**
 * PUT /api/admin/users/:id/status
 */
admin.put("/users/:id/status", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id)) {
    return c.json(
      { error: "Invalid user ID" },
      400
    );
  }

  const body = await c.req.json<{
    isActive?: boolean;
  }>();

  if (typeof body.isActive !== "boolean") {
    return c.json(
      {
        error: "isActive must be boolean"
      },
      400
    );
  }

  const currentUser = c.get("user");

  // Prevent an admin from accidentally
  // disabling their own account.
  if (
    currentUser.id === id &&
    body.isActive === false
  ) {
    return c.json(
      {
        error:
          "You cannot deactivate your own account"
      },
      400
    );
  }

  const db = drizzle(c.env.DB);

  const result = await db
    .update(users)
    .set({
      isActive: body.isActive,
      updatedAt: new Date().toISOString()
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive
    });

  if (result.length === 0) {
    return c.json(
      { error: "User not found" },
      404
    );
  }

  return c.json({
    message: "User status updated",
    user: result[0]
  });
});

export default admin;
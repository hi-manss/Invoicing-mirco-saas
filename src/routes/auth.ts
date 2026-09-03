import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Env } from "../types/env";
import { users, sessions } from "../db/schema";
import {
  createUser,
  authenticateUser,
  createSession
} from "../services/auth.service";
import { hashSessionToken } from "../utils/session";

const auth = new Hono<{ Bindings: Env }>();

const SESSION_COOKIE = "session";

auth.post("/signup", async (c) => {
  const body = await c.req.json<{
    name?: string;
    email?: string;
    password?: string;
  }>();

  if (!body.name || !body.email || !body.password) {
    return c.json(
      { error: "Name, email and password are required" },
      400
    );
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
      0
    );

    return c.json(
      {
        message: "Account created",
        user
      },
      201
    );
  } catch {
    return c.json(
      { error: "Email already exists" },
      409
    );
  }
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{
    email?: string;
    password?: string;
  }>();

  if (!body.email || !body.password) {
    return c.json(
      { error: "Email and password are required" },
      400
    );
  }

  const user = await authenticateUser(
    c.env,
    body.email,
    body.password
  );

  if (!user) {
    return c.json(
      { error: "Invalid credentials" },
      401
    );
  }

  const token = await createSession(
    c.env,
    user.id
  );

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return c.json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (token) {
    const tokenHash = await hashSessionToken(token);

    const db = drizzle(c.env.DB);

    await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
  }

  deleteCookie(c, SESSION_COOKIE, {
    path: "/"
  });

  return c.json({
    message: "Logout successful"
  });
});

auth.get("/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.json(
      { error: "Not authenticated" },
      401
    );
  }

  const tokenHash = await hashSessionToken(token);

  const db = drizzle(c.env.DB);

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      expiresAt: sessions.expiresAt
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const session = result[0];

  if (!session) {
    return c.json(
      { error: "Invalid session" },
      401
    );
  }

  if (
    !session.isActive ||
    new Date(session.expiresAt) <= new Date()
  ) {
    return c.json(
      { error: "Session expired" },
      401
    );
  }

  return c.json({
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role
    }
  });
});

export default auth;
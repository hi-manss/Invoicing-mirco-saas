import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Env } from "../types/env";
import { users, sessions } from "../db/schema";
import { hashSessionToken } from "../utils/session";

const SESSION_COOKIE = "session";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: number;
};

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
}>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.json(
      { error: "Authentication required" },
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
      userIsDeleted: users.isDeleted,
      sessionIsDeleted: sessions.isDeleted,
      expiresAt: sessions.expiresAt
    })
    .from(sessions)
    .innerJoin(
      users,
      eq(users.id, sessions.userId)
    )
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        eq(sessions.isDeleted, false),
        eq(users.isDeleted, false)
      )
    )
    .limit(1);

  const session = result[0];

  if (!session) {
    return c.json(
      { error: "Invalid session" },
      401
    );
  }

  if (session.userIsDeleted || session.sessionIsDeleted) {
    return c.json(
      { error: "Account is deleted" },
      401
    );
  }

  if (new Date(session.expiresAt) <= new Date()) {
    return c.json(
      { error: "Session expired" },
      401
    );
  }

  c.set("user", {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role
  });

  await next();
});

export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
}>(async (c, next) => {
  const user = c.get("user");

  if (!user || user.role !== 1) {
    return c.json(
      { error: "Admin access required" },
      403
    );
  }

  await next();
});

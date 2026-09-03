import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { users } from "../db/schema";
import { hashPassword } from "../utils/password";
import type { Env } from "../types/env";

export async function ensureBootstrapAdmin(env: Env) {
  const email = env.ADMIN_EMAIL.toLowerCase().trim();

  const db = drizzle(env.DB);

  const existing = await db
    .select({
      id: users.id
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Admin already exists. Never overwrite it.
  if (existing.length > 0) {
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  try {
    await db.insert(users).values({
      name: "Administrator",
      email,
      passwordHash,
      role: 1,
      isActive: true
    });
  } catch {
    // Another request may have created the same admin
    // concurrently. The unique email constraint handles this.
  }
}
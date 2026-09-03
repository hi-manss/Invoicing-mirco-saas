import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { users, sessions } from "../db/schema";
import {
  hashPassword,
  verifyPassword
} from "../utils/password";
import {
  createSessionToken,
  getSessionExpiry,
  hashSessionToken
} from "../utils/session";
import type { Env } from "../types/env";

export async function createUser(
  env: Env,
  name: string,
  email: string,
  password: string,
  role = 0
) {
  const db = drizzle(env.DB);

  const passwordHash = await hashPassword(password);

  const result = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role
    });

  return result[0];
}

export async function authenticateUser(
  env: Env,
  email: string,
  password: string
) {
  const db = drizzle(env.DB);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user[0] || !user[0].isActive) {
    return null;
  }

  const valid = await verifyPassword(
    password,
    user[0].passwordHash
  );

  if (!valid) {
    return null;
  }

  return user[0];
}

export async function createSession(
  env: Env,
  userId: number
) {
  const db = drizzle(env.DB);

  const token = await createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = getSessionExpiry();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt
  });

  return token;
}
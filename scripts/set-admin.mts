/**
 * Grants or revokes admin on a profile by email.
 *
 *   npm run admin:grant -- correo@dominio.com
 *   npm run admin:revoke -- correo@dominio.com
 *
 * The person must have logged in at least once so a profile row exists.
 * Reads DATABASE_URL from .env.local.
 */
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { profiles } from "../src/common/lib/db/schema/profiles.table";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const [mode, rawEmail] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

if ((mode !== "grant" && mode !== "revoke") || !email) {
  console.error("Usage: tsx scripts/set-admin.ts <grant|revoke> <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client);

try {
  const [row] = await db
    .update(profiles)
    .set({ isAdmin: mode === "grant" })
    .where(eq(profiles.email, email))
    .returning({ id: profiles.id, email: profiles.email, isAdmin: profiles.isAdmin });

  if (!row) {
    console.error(`No profile found for ${email}. They need to log in once first.`);
    process.exit(1);
  }
  console.log(`${row.email} is_admin=${row.isAdmin}`);
} finally {
  await client.end();
}

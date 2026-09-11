import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/common/lib/config/env.config";

import * as schema from "./schema";

/**
 * The only database entry point. Server-side only: this module refuses to
 * be bundled for the browser. All data access goes through Drizzle over a
 * direct Postgres connection; supabase-js in the browser is for auth only.
 */

const globalForDb = globalThis as unknown as {
  __lcgPgClient?: ReturnType<typeof postgres>;
};

function createClient() {
  return postgres(getServerEnv().DATABASE_URL, {
    // Supabase's transaction-mode pooler does not support prepared statements.
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const client = globalForDb.__lcgPgClient ?? createClient();

// Reuse the connection pool across hot reloads in development.
if (process.env.NODE_ENV !== "production") {
  globalForDb.__lcgPgClient = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

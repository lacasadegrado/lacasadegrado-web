import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local; drizzle-kit runs outside Next, so load it here.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/common/lib/db/schema/index.ts",
  out: "./src/common/lib/db/migrations",
  dbCredentials: {
    // `generate` does not connect; `migrate`, `push` and `studio` do.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
  // Only diff the public schema. auth.users is referenced, never managed.
  schemaFilter: ["public"],
  entities: {
    roles: {
      provider: "supabase",
    },
  },
  strict: true,
  verbose: true,
});

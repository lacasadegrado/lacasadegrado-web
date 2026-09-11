import { customType } from "drizzle-orm/pg-core";

/**
 * Postgres `citext`: case-insensitive text. Used for every email column so
 * "Ana@Mail.com" and "ana@mail.com" are the same person at the DB level,
 * regardless of what the application normalizes. The extension is created
 * at the top of the first migration.
 */
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

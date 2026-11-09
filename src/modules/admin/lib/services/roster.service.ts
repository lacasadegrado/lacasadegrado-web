import "server-only";

import { and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, formSubmissions, forms, rosterEntries, rosters } from "@/common/lib/db/schema";
import { ROSTER_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import {
  rosterColumnsSchema,
  rosterValuesSchema,
  type RosterColumn,
  type RosterValues,
} from "@/modules/forms/lib/schemas/roster.schema";
import { rosterColumnKey, rosterNameKey } from "@/modules/forms/lib/utils/roster.util";

import type { AdminRosterDetail, AdminRosterSummary, RosterOption } from "../types/roster.types";

/** Stored after validation; a failure means a corrupted row, so show nothing rather than crash. */
export function parseRosterColumns(value: unknown): RosterColumn[] {
  const parsed = rosterColumnsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseRosterValues(value: unknown): RosterValues {
  const parsed = rosterValuesSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export async function listRostersForEvent(eventId: string): Promise<AdminRosterSummary[]> {
  const rows = await db
    .select({
      id: rosters.id,
      name: rosters.name,
      columns: rosters.columns,
      sourceName: rosters.sourceName,
      updatedAt: rosters.updatedAt,
      entryCount: sql<number>`(select count(*) from ${rosterEntries} where ${rosterEntries.rosterId} = ${rosters.id})::int`,
      formCount: sql<number>`(select count(*) from ${forms} where ${forms.rosterId} = ${rosters.id})::int`,
    })
    .from(rosters)
    .where(eq(rosters.eventId, eventId))
    .orderBy(desc(rosters.createdAt));
  return rows.map((row) => ({ ...row, columns: parseRosterColumns(row.columns) }));
}

/** For the form builder: the event's lists with their columns. */
export async function listRosterOptions(eventId: string): Promise<RosterOption[]> {
  const rows = await db
    .select({ id: rosters.id, name: rosters.name, columns: rosters.columns })
    .from(rosters)
    .where(eq(rosters.eventId, eventId))
    .orderBy(asc(rosters.name));
  return rows.map((row) => ({ ...row, columns: parseRosterColumns(row.columns) }));
}

/** The list with every person, alphabetical, and when each last answered a linked form. */
export async function getRoster(rosterId: string): Promise<AdminRosterDetail | null> {
  const [roster] = await db
    .select({
      id: rosters.id,
      eventId: rosters.eventId,
      eventName: events.name,
      name: rosters.name,
      columns: rosters.columns,
      sourceName: rosters.sourceName,
      updatedAt: rosters.updatedAt,
    })
    .from(rosters)
    .innerJoin(events, eq(events.id, rosters.eventId))
    .where(eq(rosters.id, rosterId))
    .limit(1);
  if (!roster) return null;

  const [entries, linkedForms] = await Promise.all([
    db
      .select({
        id: rosterEntries.id,
        name: rosterEntries.name,
        values: rosterEntries.values,
        answeredAt: max(formSubmissions.submittedAt),
      })
      .from(rosterEntries)
      .leftJoin(formSubmissions, eq(formSubmissions.rosterEntryId, rosterEntries.id))
      .where(eq(rosterEntries.rosterId, roster.id))
      .groupBy(rosterEntries.id)
      .orderBy(asc(rosterEntries.nameKey)),
    db.select({ id: forms.id, title: forms.title }).from(forms).where(eq(forms.rosterId, roster.id)).orderBy(asc(forms.title)),
  ]);

  return {
    ...roster,
    columns: parseRosterColumns(roster.columns),
    forms: linkedForms,
    entries: entries.map((entry) => ({
      ...entry,
      values: parseRosterValues(entry.values),
      answeredAt: entry.answeredAt ? new Date(entry.answeredAt) : null,
    })),
  };
}

/**
 * Step 1 of an import: creates the list, or adds the file's columns to an
 * existing one (a column whose header matches an existing one, ignoring
 * accents and case, keeps its key). Returns the key of each label, in order.
 */
export async function prepareRosterImport(input: {
  eventId: string;
  rosterId?: string;
  name: string;
  labels: string[];
  sourceName: string | null;
}): Promise<{ ok: true; rosterId: string; keys: string[] } | { ok: false; reason: "not_found" | "too_many_columns" }> {
  return db.transaction(async (tx) => {
    let rosterId = input.rosterId;
    let columns: RosterColumn[] = [];
    if (rosterId) {
      const [existing] = await tx
        .select({ columns: rosters.columns, eventId: rosters.eventId })
        .from(rosters)
        .where(eq(rosters.id, rosterId))
        .for("update")
        .limit(1);
      if (!existing || existing.eventId !== input.eventId) return { ok: false, reason: "not_found" };
      columns = parseRosterColumns(existing.columns);
    }

    const taken = new Set(columns.map((column) => column.key));
    const keys = input.labels.map((label) => {
      const match = columns.find((column) => rosterNameKey(column.label) === rosterNameKey(label));
      if (match) return match.key;
      const key = rosterColumnKey(label, taken);
      columns.push({ key, label });
      return key;
    });
    if (columns.length > ROSTER_LIMITS.maxColumns) return { ok: false, reason: "too_many_columns" };

    if (rosterId) {
      await tx.update(rosters).set({ columns, sourceName: input.sourceName }).where(eq(rosters.id, rosterId));
    } else {
      const [created] = await tx
        .insert(rosters)
        .values({ eventId: input.eventId, name: input.name, columns, sourceName: input.sourceName })
        .returning({ id: rosters.id });
      rosterId = created.id;
    }
    return { ok: true, rosterId, keys };
  });
}

/**
 * Step 2, in batches: people are matched by name (accents, case and
 * spaces ignored). A match keeps its other columns and takes the file's
 * non-empty cells; empty cells never erase what the list had.
 */
export async function importRosterRows(
  rosterId: string,
  rows: { name: string; values: RosterValues }[],
): Promise<{ ok: true; created: number; updated: number } | { ok: false; reason: "not_found" | "too_many" }> {
  return db.transaction(async (tx) => {
    const [roster] = await tx.select({ id: rosters.id }).from(rosters).where(eq(rosters.id, rosterId)).for("update").limit(1);
    if (!roster) return { ok: false, reason: "not_found" };

    const keys = [...new Set(rows.map((row) => rosterNameKey(row.name)))];
    const existing = keys.length
      ? await tx
          .select({ id: rosterEntries.id, nameKey: rosterEntries.nameKey, values: rosterEntries.values })
          .from(rosterEntries)
          .where(and(eq(rosterEntries.rosterId, rosterId), inArray(rosterEntries.nameKey, keys)))
      : [];
    const byKey = new Map(existing.map((entry) => [entry.nameKey, entry]));

    const [{ total }] = await tx.select({ total: count() }).from(rosterEntries).where(eq(rosterEntries.rosterId, rosterId));
    const newPeople = keys.filter((key) => !byKey.has(key)).length;
    if (total + newPeople > ROSTER_LIMITS.maxEntries) return { ok: false, reason: "too_many" };

    // Merged in memory first (a batch may repeat a person), then one insert and one update.
    const toInsert = new Map<string, { name: string; values: RosterValues }>();
    const toUpdate = new Map<string, { id: string; name: string; values: RosterValues }>();
    for (const row of rows) {
      const nameKey = rosterNameKey(row.name);
      const filled = Object.fromEntries(Object.entries(row.values).filter(([, value]) => value.trim() !== ""));
      const match = byKey.get(nameKey);
      if (match) {
        const base = toUpdate.get(nameKey)?.values ?? parseRosterValues(match.values);
        toUpdate.set(nameKey, { id: match.id, name: row.name.trim(), values: { ...base, ...filled } });
      } else {
        const base = toInsert.get(nameKey)?.values ?? {};
        toInsert.set(nameKey, { name: row.name.trim(), values: { ...base, ...filled } });
      }
    }

    if (toInsert.size > 0) {
      await tx.insert(rosterEntries).values(
        [...toInsert.entries()].map(([nameKey, entry]) => ({ rosterId, nameKey, name: entry.name, values: entry.values })),
      );
    }
    if (toUpdate.size > 0) {
      const values = sql.join(
        [...toUpdate.values()].map((entry) => sql`(${entry.id}::uuid, ${entry.name}, ${JSON.stringify(entry.values)}::jsonb)`),
        sql`, `,
      );
      await tx.execute(sql`
        update ${rosterEntries} set name = v.name, values = v.values, updated_at = now()
        from (values ${values}) as v(id, name, values)
        where ${rosterEntries.id} = v.id`);
    }
    await tx.update(rosters).set({ updatedAt: new Date() }).where(eq(rosters.id, rosterId));
    return { ok: true, created: toInsert.size, updated: toUpdate.size };
  });
}

export async function renameRoster(rosterId: string, name: string): Promise<{ eventId: string } | null> {
  const [row] = await db.update(rosters).set({ name }).where(eq(rosters.id, rosterId)).returning({ eventId: rosters.eventId });
  return row ?? null;
}

/** Linked forms stop prefilling; answers keep the values they were prefilled with. */
export async function deleteRoster(rosterId: string): Promise<{ eventId: string } | null> {
  const [row] = await db.delete(rosters).where(eq(rosters.id, rosterId)).returning({ eventId: rosters.eventId });
  return row ?? null;
}

export async function deleteRosterEntry(entryId: string): Promise<{ rosterId: string } | null> {
  const [row] = await db
    .delete(rosterEntries)
    .where(eq(rosterEntries.id, entryId))
    .returning({ rosterId: rosterEntries.rosterId });
  return row ?? null;
}

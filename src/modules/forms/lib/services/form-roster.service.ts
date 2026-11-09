import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { rosterEntries, rosters } from "@/common/lib/db/schema";

import { ROSTER_NAME_COLUMN } from "../constants/forms.constants";
import { rosterColumnsSchema, rosterValuesSchema, type RosterValues } from "../schemas/roster.schema";
import type { FormField } from "../types/form.types";
import type { RosterPerson, RosterPrefill } from "../types/public-form.types";
import { rosterPrefillValue } from "../utils/roster.util";

type RosterEntryData = { id: string; name: string; values: RosterValues };

function parseValues(value: unknown): RosterValues {
  const parsed = rosterValuesSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

/**
 * Names to pick, alphabetical. Two people with the same name get the
 * first column value that tells them apart (their career, school…).
 */
export async function listRosterPeople(rosterId: string): Promise<RosterPerson[]> {
  const [[roster], entries] = await Promise.all([
    db.select({ columns: rosters.columns }).from(rosters).where(eq(rosters.id, rosterId)).limit(1),
    db
      .select({ id: rosterEntries.id, name: rosterEntries.name, nameKey: rosterEntries.nameKey, values: rosterEntries.values })
      .from(rosterEntries)
      .where(eq(rosterEntries.rosterId, rosterId))
      .orderBy(asc(rosterEntries.nameKey)),
  ]);
  const columns = rosterColumnsSchema.safeParse(roster?.columns).data ?? [];
  const repeated = new Set(
    entries.map((entry) => entry.nameKey).filter((key, index, all) => all.indexOf(key) !== index),
  );
  return entries.map((entry) => {
    if (!repeated.has(entry.nameKey)) return { id: entry.id, name: entry.name, hint: null };
    const values = parseValues(entry.values);
    const hint = columns.map((column) => values[column.key]).find(Boolean) ?? null;
    return { id: entry.id, name: entry.name, hint };
  });
}

/** One person of the list, only if they belong to it. */
export async function getRosterEntry(rosterId: string, entryId: string): Promise<RosterEntryData | null> {
  const [entry] = await db
    .select({ id: rosterEntries.id, name: rosterEntries.name, values: rosterEntries.values })
    .from(rosterEntries)
    .where(and(eq(rosterEntries.id, entryId), eq(rosterEntries.rosterId, rosterId)))
    .limit(1);
  return entry ? { ...entry, values: parseValues(entry.values) } : null;
}

/** The raw cell behind a linked question; `name` is the person's name. */
function rawValue(field: FormField, entry: RosterEntryData): string | undefined {
  if (!field.rosterColumn) return undefined;
  return field.rosterColumn === ROSTER_NAME_COLUMN ? entry.name : entry.values[field.rosterColumn];
}

/** Starting answers for the linked questions; empty or unmatched cells stay for the person to fill. */
export function buildRosterPrefill(fields: FormField[], entry: RosterEntryData): RosterPrefill {
  const values: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const field of fields) {
    if (!field.rosterColumn) continue;
    const value = rosterPrefillValue(field, rawValue(field, entry));
    if (value === undefined) missing.push(field.id);
    else values[field.id] = value;
  }
  return { values, missing };
}

/** What the list said for each linked question, kept with the answer to show changes later. */
export function rosterSnapshot(fields: FormField[], entry: RosterEntryData): Record<string, string> {
  return Object.fromEntries(
    fields.filter((field) => field.rosterColumn).map((field) => [field.id, rawValue(field, entry)?.trim() ?? ""]),
  );
}

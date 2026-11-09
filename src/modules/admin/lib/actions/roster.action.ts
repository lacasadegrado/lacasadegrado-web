"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROSTER_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import { rosterNameSchema, rosterValuesSchema } from "@/modules/forms/lib/schemas/roster.schema";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { requireAdmin } from "../services/admin-access.service";
import {
  deleteRoster,
  deleteRosterEntry,
  importRosterRows,
  prepareRosterImport,
  renameRoster,
} from "../services/roster.service";

const listNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Ponle un nombre al listado." })
  .max(ROSTER_LIMITS.rosterNameMax);

const prepareSchema = z.object({
  eventId: z.uuid(),
  rosterId: z.uuid().optional(),
  name: listNameSchema,
  labels: z.array(z.string().trim().min(1).max(ROSTER_LIMITS.labelMax)).max(ROSTER_LIMITS.maxColumns),
  sourceName: z.string().trim().max(200).nullable(),
});

const rowsSchema = z.object({
  rosterId: z.uuid(),
  rows: z
    .array(z.object({ name: rosterNameSchema, values: rosterValuesSchema }))
    .min(1)
    .max(ROSTER_LIMITS.batchSize),
});

function revalidateRosters(rosterId?: string) {
  revalidatePath(ADMIN_PATHS.eventForms, "layout");
  if (rosterId) revalidatePath(ADMIN_PATHS.roster(rosterId));
}

/** Creates the list or adds the file's columns; the rows follow in batches. */
export async function prepareRosterImportAction(
  input: z.input<typeof prepareSchema>,
): Promise<{ ok: true; rosterId: string; keys: string[] } | { ok: false; message: string }> {
  await requireAdmin();
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const result = await prepareRosterImport(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "too_many_columns"
          ? `Un listado admite hasta ${ROSTER_LIMITS.maxColumns} columnas.`
          : "No encontramos el listado. Recarga la página.",
    };
  }
  return result;
}

export async function importRosterRowsAction(
  input: z.input<typeof rowsSchema>,
): Promise<{ ok: true; created: number; updated: number } | { ok: false; message: string }> {
  await requireAdmin();
  const parsed = rowsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hay filas con datos no válidos (nombre vacío o celdas muy largas)." };
  const result = await importRosterRows(parsed.data.rosterId, parsed.data.rows);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "too_many"
          ? `Un listado admite hasta ${ROSTER_LIMITS.maxEntries} personas.`
          : "No encontramos el listado. Recarga la página.",
    };
  }
  revalidateRosters(parsed.data.rosterId);
  return result;
}

export async function renameRosterAction(input: { rosterId: string; name: string }): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const parsed = z.object({ rosterId: z.uuid(), name: listNameSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Nombre no válido." };
  const result = await renameRoster(parsed.data.rosterId, parsed.data.name);
  if (!result) return { ok: false, message: "No encontramos el listado." };
  revalidateRosters(parsed.data.rosterId);
  return { ok: true, message: "Nombre guardado." };
}

export async function deleteRosterAction(input: { rosterId: string }): Promise<{ ok: boolean; message: string; eventId?: string }> {
  await requireAdmin();
  const parsed = z.object({ rosterId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Listado no válido." };
  const result = await deleteRoster(parsed.data.rosterId);
  if (!result) return { ok: false, message: "No encontramos el listado." };
  revalidateRosters();
  return { ok: true, message: "Listado eliminado.", eventId: result.eventId };
}

export async function deleteRosterEntryAction(input: { entryId: string }): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const parsed = z.object({ entryId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Persona no válida." };
  const result = await deleteRosterEntry(parsed.data.entryId);
  if (!result) return { ok: false, message: "No encontramos a esa persona." };
  revalidateRosters(result.rosterId);
  return { ok: true, message: "Persona eliminada del listado." };
}

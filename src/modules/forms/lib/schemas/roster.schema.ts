import { z } from "zod";

import { ROSTER_LIMITS, ROSTER_NAME_COLUMN } from "../constants/forms.constants";

/**
 * People lists ("Listados"): their columns and each person's values, as
 * `rosters.columns` and `roster_entries.values` store them. Every read of
 * those jsonb columns parses through these schemas.
 */

export const rosterColumnKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,39}$/)
  .refine((key) => key !== ROSTER_NAME_COLUMN, { error: "Columna reservada." });

export const rosterColumnSchema = z.object({
  key: rosterColumnKeySchema,
  label: z.string().trim().min(1).max(ROSTER_LIMITS.labelMax),
});

export const rosterColumnsSchema = z
  .array(rosterColumnSchema)
  .max(ROSTER_LIMITS.maxColumns)
  .refine((columns) => new Set(columns.map((column) => column.key)).size === columns.length, {
    error: "Hay dos columnas con la misma clave.",
  });

/** Column key → cell text. Empty cells are simply absent. */
export const rosterValuesSchema = z.record(z.string(), z.string().max(ROSTER_LIMITS.cellMax));

export const rosterNameSchema = z.string().trim().min(1, { error: "Falta el nombre." }).max(ROSTER_LIMITS.nameMax);

export type RosterColumn = z.infer<typeof rosterColumnSchema>;
export type RosterValues = z.infer<typeof rosterValuesSchema>;

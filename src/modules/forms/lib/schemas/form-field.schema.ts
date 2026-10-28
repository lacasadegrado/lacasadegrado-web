import { z } from "zod";

import type { FormKind } from "@/common/lib/db/schema";

import {
  FORM_FILE_ACCEPT,
  FORM_KIND_SYSTEM_ROLES,
  FORM_LIMITS,
  FORM_SYSTEM_FIELDS,
  PERSON_NAME_FIELD_TYPES,
} from "../constants/forms.constants";

/**
 * Field definitions, as the admin builds them and as `forms.fields` and
 * `form_submissions.fields_snapshot` store them. Every read of those
 * jsonb columns parses through `formFieldsSchema`.
 */

const systemRoleSchema = z.enum(
  Object.keys(FORM_SYSTEM_FIELDS) as [keyof typeof FORM_SYSTEM_FIELDS, ...(keyof typeof FORM_SYSTEM_FIELDS)[]],
);

const baseField = {
  /** Stable key of the answer. System fields use their role as id. */
  id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, { error: "Id de campo inválido." }),
  label: z
    .string()
    .trim()
    .min(1, { error: "Cada campo necesita una pregunta." })
    .max(FORM_LIMITS.labelMax),
  helpText: z.string().trim().max(FORM_LIMITS.helpTextMax).optional(),
  required: z.boolean(),
  system: systemRoleSchema.optional(),
  /**
   * This answer is the person's name: it labels their email in the
   * tagging suggestions. One field per form at most.
   */
  personName: z.boolean().optional(),
};

const lengthBounds = (max: number) => ({
  minLength: z.int().min(0).max(max).optional(),
  maxLength: z.int().min(1).max(max).optional(),
});

const optionsSchema = z
  .array(z.string().trim().min(1, { error: "Las opciones no pueden estar vacías." }).max(FORM_LIMITS.optionMax))
  .min(1, { error: "Agrega al menos una opción." })
  .max(FORM_LIMITS.maxOptions)
  .refine((options) => new Set(options.map((option) => option.toLowerCase())).size === options.length, {
    error: "Hay opciones repetidas.",
  });

const isoDate = z.iso.date();

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({ ...baseField, type: z.literal("short_text"), ...lengthBounds(FORM_LIMITS.shortTextMax) }),
  z.object({ ...baseField, type: z.literal("long_text"), ...lengthBounds(FORM_LIMITS.longTextMax) }),
  z.object({ ...baseField, type: z.literal("email") }),
  z.object({ ...baseField, type: z.literal("phone") }),
  z.object({ ...baseField, type: z.literal("id_number") }),
  z.object({
    ...baseField,
    type: z.literal("number"),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    integer: z.boolean().optional(),
  }),
  z.object({ ...baseField, type: z.literal("date"), min: isoDate.optional(), max: isoDate.optional() }),
  z.object({ ...baseField, type: z.literal("select"), options: optionsSchema }),
  z.object({ ...baseField, type: z.literal("radio"), options: optionsSchema }),
  z.object({
    ...baseField,
    type: z.literal("checkboxes"),
    options: optionsSchema,
    minSelected: z.int().min(0).max(FORM_LIMITS.maxOptions).optional(),
    maxSelected: z.int().min(1).max(FORM_LIMITS.maxOptions).optional(),
  }),
  z.object({
    ...baseField,
    type: z.literal("file"),
    accept: z.enum(Object.keys(FORM_FILE_ACCEPT) as [keyof typeof FORM_FILE_ACCEPT, ...(keyof typeof FORM_FILE_ACCEPT)[]]),
    maxFiles: z.int().min(1).max(FORM_LIMITS.maxFilesPerField),
    maxSizeMb: z.int().min(1).max(FORM_LIMITS.maxFileMb),
  }),
  /** Options come from the event's active packages at render time. */
  z.object({ ...baseField, type: z.literal("package") }),
]);

/** Lower bound above upper bound, per field type; null when consistent. */
function boundsError(field: z.infer<typeof formFieldSchema>): string | null {
  switch (field.type) {
    case "short_text":
    case "long_text":
      return field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength
        ? "El mínimo de caracteres supera al máximo."
        : null;
    case "number":
      return field.min !== undefined && field.max !== undefined && field.min > field.max
        ? "El valor mínimo supera al máximo."
        : null;
    case "date":
      return field.min && field.max && field.min > field.max ? "La fecha mínima es posterior a la máxima." : null;
    case "checkboxes": {
      if (field.minSelected !== undefined && field.maxSelected !== undefined && field.minSelected > field.maxSelected) {
        return "El mínimo de casillas supera al máximo.";
      }
      if ((field.minSelected ?? 0) > field.options.length) return "Pides marcar más casillas de las que hay.";
      return null;
    }
    default:
      return null;
  }
}

/**
 * A whole form, whatever its kind: ids unique, each system field at most
 * once with its fixed type (required or not, the admin decides), `package`
 * only as the system field, and at most one person-name field. Old forms
 * and answer snapshots keep parsing. `validateFieldsForKind` adds the
 * per-kind rule when saving.
 */
export const formFieldsSchema = z
  .array(formFieldSchema)
  .max(FORM_LIMITS.maxFields, { error: `Un formulario admite hasta ${FORM_LIMITS.maxFields} campos.` })
  .superRefine((fields, ctx) => {
    const ids = new Set<string>();
    for (const [index, field] of fields.entries()) {
      if (ids.has(field.id)) {
        ctx.addIssue({ code: "custom", path: [index, "id"], message: "Hay dos campos con el mismo id." });
      }
      ids.add(field.id);

      const bounds = boundsError(field);
      if (bounds) ctx.addIssue({ code: "custom", path: [index], message: bounds });

      if (field.type === "package" && field.system !== "package") {
        ctx.addIssue({ code: "custom", path: [index, "type"], message: "El paquete solo puede ser el campo del sistema." });
      }
      if (field.system) {
        if (field.id !== field.system) {
          ctx.addIssue({ code: "custom", path: [index, "id"], message: "Un campo del sistema usa su rol como id." });
        }
        if (field.type !== FORM_SYSTEM_FIELDS[field.system]) {
          ctx.addIssue({ code: "custom", path: [index, "type"], message: "No se puede cambiar el tipo de un campo del sistema." });
        }
      }
      if (field.personName && !(PERSON_NAME_FIELD_TYPES as readonly string[]).includes(field.type)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "personName"],
          message: "Solo un texto corto, una lista o una opción única pueden ser el nombre de la persona.",
        });
      }
    }

    for (const role of Object.keys(FORM_SYSTEM_FIELDS) as (keyof typeof FORM_SYSTEM_FIELDS)[]) {
      if (fields.filter((field) => field.system === role).length > 1) {
        ctx.addIssue({ code: "custom", path: [], message: `Hay más de un campo "${role}".` });
      }
    }
    if (fields.filter((field) => field.personName).length > 1) {
      ctx.addIssue({ code: "custom", path: [], message: "Solo un campo puede ser el nombre de la persona." });
    }
  });

const ROLE_LABELS: Record<keyof typeof FORM_SYSTEM_FIELDS, string> = {
  email: "correo",
  package: "paquete",
  reference: "referencia",
  proof: "comprobante",
};

/**
 * The per-kind rule, checked when the admin saves: a payment form has all
 * four system fields, a general form only the email. Each exactly once.
 */
export function validateFieldsForKind(
  fields: z.infer<typeof formFieldSchema>[],
  kind: FormKind,
): { path: (string | number)[]; message: string }[] {
  const allowed: readonly string[] = FORM_KIND_SYSTEM_ROLES[kind];
  const issues: { path: (string | number)[]; message: string }[] = [];
  for (const role of allowed) {
    if (!fields.some((field) => field.system === role)) {
      issues.push({ path: [], message: `Falta el campo del sistema "${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}".` });
    }
  }
  for (const [index, field] of fields.entries()) {
    if (field.system && !allowed.includes(field.system)) {
      issues.push({ path: [index], message: "Este campo del sistema no corresponde a este tipo de formulario." });
    }
  }
  return issues;
}

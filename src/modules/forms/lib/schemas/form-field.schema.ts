import { z } from "zod";

import { FORM_FILE_ACCEPT, FORM_LIMITS, FORM_SYSTEM_FIELDS } from "../constants/forms.constants";

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
 * A whole form: ids unique, every system field exactly once with its
 * fixed type and always required, and `package` only as the system field.
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
        if (!field.required) {
          ctx.addIssue({ code: "custom", path: [index, "required"], message: "Los campos del sistema son obligatorios." });
        }
      }
    }

    for (const role of Object.keys(FORM_SYSTEM_FIELDS) as (keyof typeof FORM_SYSTEM_FIELDS)[]) {
      const count = fields.filter((field) => field.system === role).length;
      if (count !== 1) {
        ctx.addIssue({ code: "custom", path: [], message: `El formulario debe tener exactamente un campo "${role}".` });
      }
    }
  });

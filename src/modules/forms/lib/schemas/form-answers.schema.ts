import { z } from "zod";

import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

import { FORM_LIMITS, FORM_MESSAGES } from "../constants/forms.constants";
import type { FormField, FormPackageOption } from "../types/form.types";

/**
 * Builds the Zod schema for one form's answers from its field
 * definitions. The public page validates with it for instant feedback and
 * the server validates again with the same function; the server's answer
 * is the one that counts. File keys are only shape-checked here: the
 * submission service checks their prefix and the stored objects.
 */

/** Browsers send "" for an untouched input; treat it as no answer. */
function blankToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

/**
 * Empty answers become undefined; a required field left empty gets one
 * plain message instead of Zod's "expected string, received undefined".
 */
function withPresence(schema: z.ZodType, required: boolean): z.ZodType {
  return z.preprocess(
    (value, ctx) => {
      const normalized = blankToUndefined(value);
      if (normalized === undefined && required) {
        ctx.addIssue({ code: "custom", message: FORM_MESSAGES.required });
        return z.NEVER;
      }
      return normalized;
    },
    required ? schema : schema.optional(),
  );
}

const PHONE_RE = /^(?:\+?58|0)?((?:2\d{2}|4\d{2})\d{7})$/;
const ID_NUMBER_RE = /^([VEJPG])-?(\d{5,9})$/i;

function textSchema(field: Extract<FormField, { type: "short_text" | "long_text" }>) {
  const hardMax = field.type === "short_text" ? FORM_LIMITS.shortTextMax : FORM_LIMITS.longTextMax;
  const max = field.maxLength ?? hardMax;
  let schema = z.string().trim().max(max, { error: `Máximo ${max} caracteres.` });
  if (field.minLength) {
    schema = schema.min(field.minLength, { error: `Mínimo ${field.minLength} caracteres.` });
  }
  return schema;
}

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(PHONE_RE, { error: FORM_MESSAGES.invalid_phone }))
  // Stored as 0 + ten digits, e.g. 04141234567.
  .transform((value) => `0${PHONE_RE.exec(value)?.[1] ?? value}`);

const idNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.]/g, ""))
  .pipe(z.string().regex(ID_NUMBER_RE, { error: FORM_MESSAGES.invalid_id_number }))
  // Stored as V-12345678.
  .transform((value) => {
    const [, letter, digits] = ID_NUMBER_RE.exec(value) ?? [];
    return `${letter?.toUpperCase()}-${digits}`;
  });

function numberSchema(field: Extract<FormField, { type: "number" }>) {
  let schema = z.coerce.number({ error: FORM_MESSAGES.invalid_number }).refine(Number.isFinite, {
    error: FORM_MESSAGES.invalid_number,
  });
  if (field.integer) schema = schema.refine(Number.isInteger, { error: FORM_MESSAGES.invalid_integer });
  if (field.min !== undefined) {
    const min = field.min;
    schema = schema.refine((value) => value >= min, { error: `El mínimo es ${min}.` });
  }
  if (field.max !== undefined) {
    const max = field.max;
    schema = schema.refine((value) => value <= max, { error: `El máximo es ${max}.` });
  }
  return schema;
}

function dateSchema(field: Extract<FormField, { type: "date" }>) {
  let schema = z.iso.date({ error: FORM_MESSAGES.invalid_date });
  if (field.min) {
    const min = field.min;
    schema = schema.refine((value) => value >= min, { error: `La fecha no puede ser anterior a ${min}.` });
  }
  if (field.max) {
    const max = field.max;
    schema = schema.refine((value) => value <= max, { error: `La fecha no puede ser posterior a ${max}.` });
  }
  return schema;
}

function optionSchema(options: string[]) {
  return z.string().refine((value) => options.includes(value), { error: FORM_MESSAGES.invalid_option });
}

function checkboxesSchema(field: Extract<FormField, { type: "checkboxes" }>) {
  const min = Math.max(field.minSelected ?? 0, field.required ? 1 : 0);
  let schema = z
    .array(optionSchema(field.options))
    .refine((values) => new Set(values).size === values.length, { error: FORM_MESSAGES.invalid_option });
  if (min > 0) {
    schema = schema.refine((values) => values.length >= min, {
      error: min === 1 ? FORM_MESSAGES.required : `Marca al menos ${min}.`,
    });
  }
  if (field.maxSelected !== undefined) {
    const max = field.maxSelected;
    schema = schema.refine((values) => values.length <= max, { error: `Marca como máximo ${max}.` });
  }
  return schema;
}

function fileSchema(field: Extract<FormField, { type: "file" }>) {
  return z
    .array(z.object({ key: z.string().min(1).max(500), name: z.string().trim().min(1).max(255) }))
    .min(1, { error: FORM_MESSAGES.required })
    .max(field.maxFiles, { error: `Máximo ${field.maxFiles} archivo${field.maxFiles === 1 ? "" : "s"}.` });
}

function packageSchema(packages: FormPackageOption[]) {
  const ids = new Set(packages.map((option) => option.id));
  return z.string().refine((value) => ids.has(value), { error: FORM_MESSAGES.invalid_package });
}

function valueSchema(field: FormField, packages: FormPackageOption[]): z.ZodType {
  switch (field.type) {
    case "short_text":
    case "long_text":
      return textSchema(field);
    case "email":
      return emailSchema;
    case "phone":
      return phoneSchema;
    case "id_number":
      return idNumberSchema;
    case "number":
      return numberSchema(field);
    case "date":
      return dateSchema(field);
    case "select":
    case "radio":
      return optionSchema(field.options);
    case "checkboxes":
      return checkboxesSchema(field);
    case "file":
      return fileSchema(field);
    case "package":
      return packageSchema(packages);
  }
}

/**
 * `packages` are the options the page offered: the event's active
 * packages. A package id outside that list is rejected.
 */
export function buildAnswersSchema(fields: FormField[], packages: FormPackageOption[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    shape[field.id] = withPresence(valueSchema(field, packages), field.required);
  }
  // Strict: an answer for a field the form does not have is an error.
  return z.strictObject(shape);
}

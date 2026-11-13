import { z } from "zod";

import type { FormKind } from "@/common/lib/db/schema";

import { FORM_TEXTS, type FormTextKey } from "../constants/forms.constants";

/**
 * The admin's own wording for the public form (`forms.texts`). Only the
 * texts they changed are stored; empty ones fall back to the defaults.
 */
export const formTextsSchema = z
  .object(
    Object.fromEntries(
      Object.entries(FORM_TEXTS).map(([key, text]) => [
        key,
        z.string().trim().max(text.max, { error: `Máximo ${text.max} caracteres.` }).optional(),
      ]),
    ) as Record<FormTextKey, z.ZodOptional<z.ZodString>>,
  )
  .transform((texts) =>
    Object.fromEntries(Object.entries(texts).filter(([, value]) => value)) as Partial<Record<FormTextKey, string>>,
  );

export type FormTexts = Partial<Record<FormTextKey, string>>;

/** Stored jsonb, checked instead of trusted; anything odd falls back to the defaults. */
export function parseFormTexts(value: unknown): FormTexts {
  const parsed = formTextsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

/** The admin's text, else the default for this kind of form; null = the page builds it. */
export function formText(texts: FormTexts, key: FormTextKey, kind: FormKind): string | null {
  const custom = texts[key];
  if (custom) return custom;
  const text = FORM_TEXTS[key];
  const byKind = "kindDefaults" in text ? (text.kindDefaults as Partial<Record<FormKind, string>>)[kind] : undefined;
  return byKind ?? text.default;
}

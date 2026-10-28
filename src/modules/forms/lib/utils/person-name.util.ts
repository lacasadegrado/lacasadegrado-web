import type { FormField } from "../types/form.types";

/**
 * The person's name in one submission: the answer to the field the admin
 * marked "Es el nombre de la persona", trimmed. Null when no field is
 * marked or it was left empty.
 */
export function personNameFrom(fields: FormField[], answers: Record<string, unknown>): string | null {
  const field = fields.find((item) => item.personName);
  if (!field) return null;
  const value = answers[field.id];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

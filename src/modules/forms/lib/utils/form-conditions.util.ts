import type { FormField } from "../types/form.types";

/** The picked option(s) of a choice answer: a string, or an array for checkboxes. */
function pickedOptions(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

/**
 * Ids of the questions the person sees with these answers. A question
 * with a condition shows when the question it depends on is visible and
 * has one of its options picked; conditions only point back, so one pass
 * in form order is enough. Used by the public page, the answer schema
 * (hidden answers are dropped, never required) and the admin detail.
 */
export function visibleFieldIds(fields: FormField[], answers: Record<string, unknown>): Set<string> {
  const visible = new Set<string>();
  for (const field of fields) {
    const condition = field.showIf;
    if (!condition) {
      visible.add(field.id);
      continue;
    }
    if (!visible.has(condition.fieldId)) continue;
    const picked = pickedOptions(answers[condition.fieldId]);
    if (picked.some((option) => condition.values.includes(option))) visible.add(field.id);
  }
  return visible;
}

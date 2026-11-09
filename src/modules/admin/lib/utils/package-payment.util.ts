import type { FormField, FormFileAnswer } from "@/modules/forms/lib/types/form.types";
import { visibleFieldIds } from "@/modules/forms/lib/utils/form-conditions.util";
import { rosterNameKey, rosterPrefillValue } from "@/modules/forms/lib/utils/roster.util";

/**
 * Answers are read back from jsonb written by the answers schema, but the
 * shape is checked again here instead of trusted.
 */
export function fileAnswers(value: unknown): FormFileAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is FormFileAnswer =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as FormFileAnswer).key === "string" &&
      typeof (item as FormFileAnswer).name === "string",
  );
}

/**
 * One answer as text for the detail page and the Excel. Files are handled
 * apart (they become links); the package shows its snapshot name.
 */
export function answerText(field: FormField, value: unknown, packageName: string | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  switch (field.type) {
    case "package":
      return packageName;
    case "file": {
      const files = fileAnswers(value);
      return files.length > 0 ? files.map((file) => file.name).join(", ") : null;
    }
    case "checkboxes":
      return Array.isArray(value) && value.length > 0 ? value.map(String).join(", ") : null;
    default:
      return String(value);
  }
}

/** A linked question the person corrected, or filled because the list had it empty. */
export type RosterChange = {
  fieldId: string;
  label: string;
  /** What the list said; empty when it had nothing. */
  before: string;
  /** What they sent; null when they cleared it. */
  after: string | null;
  kind: "changed" | "filled";
};

/**
 * Compares an answer with the list values it was prefilled with. Format
 * differences the prefill itself makes (accents, case, "15/03/2026" vs
 * "2026-03-15") are not changes. Questions a condition hid are skipped.
 */
export function rosterChanges(
  fields: FormField[],
  answers: Record<string, unknown>,
  snapshot: Record<string, string>,
): RosterChange[] {
  const visible = visibleFieldIds(fields, answers);
  const changes: RosterChange[] = [];
  for (const field of fields) {
    if (!(field.id in snapshot) || !visible.has(field.id)) continue;
    const before = snapshot[field.id] ?? "";
    const value = answers[field.id];
    const after = answerText(field, value, null);
    if (!before && !after) continue;
    if (!before) {
      changes.push({ fieldId: field.id, label: field.label, before, after, kind: "filled" });
      continue;
    }
    const same =
      JSON.stringify(rosterPrefillValue(field, before)) === JSON.stringify(value) ||
      (after !== null && rosterNameKey(after) === rosterNameKey(before));
    if (!same) changes.push({ fieldId: field.id, label: field.label, before, after, kind: "changed" });
  }
  return changes;
}

/** The stored snapshot, checked instead of trusted; null when the form had no list. */
export function rosterSnapshotRecord(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function isImageName(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

import type { FormField, FormFileAnswer } from "@/modules/forms/lib/types/form.types";

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
export function answerText(field: FormField, value: unknown, packageName: string): string | null {
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

export function isImageName(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

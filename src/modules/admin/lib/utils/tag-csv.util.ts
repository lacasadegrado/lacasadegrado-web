import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

import { BULK_TAG_CSV } from "../constants/admin.constants";

export type TagCsvRow = { line: number; filename: string; email: string };
export type TagCsvParse = {
  rows: TagCsvRow[];
  invalid: { line: number; reason: string }[];
};

/**
 * Parses "filename,email" lines. Tolerant of semicolons and tabs, quotes,
 * blank lines and a header row. Filenames are compared without regard to
 * case, and with or without extension, by the service.
 */
export function parseTagCsv(text: string): TagCsvParse {
  const rows: TagCsvRow[] = [];
  const invalid: TagCsvParse["invalid"] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const cells = trimmed
      .split(BULK_TAG_CSV.separators)
      .map((cell) => cell.trim().replace(/^["']|["']$/g, ""));

    const [filename, emailRaw] = cells;
    if (!filename || !emailRaw) {
      invalid.push({ line, reason: "Faltan columnas. Formato: archivo,correo" });
      return;
    }

    if (
      index === 0 &&
      BULK_TAG_CSV.headerNames.includes(filename.toLowerCase() as never)
    ) {
      return;
    }

    const email = emailSchema.safeParse(emailRaw);
    if (!email.success) {
      invalid.push({ line, reason: `Correo inválido: ${emailRaw}` });
      return;
    }

    rows.push({ line, filename, email: email.data });
  });

  return { rows, invalid };
}

/** Normalized key for matching a filename: lowercase, no extension. */
export function filenameKey(filename: string): string {
  return filename.trim().toLowerCase().replace(/\.[a-z0-9]+$/i, "");
}

import type { FormField } from "../types/form.types";
import { ROSTER_NAME_COLUMN } from "../constants/forms.constants";

/** "María  José Peña" and "maria jose pena" are the same person: lists match by this. */
export function rosterNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** "Talla de toga" → "talla_de_toga", unique among `taken` and never the name key. */
export function rosterColumnKey(label: string, taken: Set<string>): string {
  const base =
    rosterNameKey(label)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "c_$1")
      .slice(0, 32) || "columna";
  let key = base === ROSTER_NAME_COLUMN ? `${base}_2` : base;
  for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
  taken.add(key);
  return key;
}

/**
 * Splits CSV or pasted cells into rows. Tabs win (cells copied from Excel
 * or Google Sheets), then `;` (Spanish Excel CSV), then `,`. Quotes may
 * wrap cells with separators or line breaks.
 */
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((cells) => cells.map((value) => value.trim()));
}

/** The first row with at least two filled cells: titles above the table are skipped. */
export function findHeaderRow(rows: string[][]): number {
  const index = rows.findIndex((row) => row.filter((cell) => cell !== "").length >= 2);
  return index === -1 ? 0 : index;
}

/** The column most likely holding the person's name. */
export function guessNameColumn(headers: string[]): number {
  const keys = headers.map(rosterNameKey);
  const exact = keys.findIndex((key) => /^nombres?( y apellidos?)?$/.test(key) || key === "nombre completo");
  if (exact !== -1) return exact;
  const loose = keys.findIndex((key) => key.includes("nombre"));
  return loose === -1 ? 0 : loose;
}

/** "Nº", "N°", "No.", "#": row numbers, not worth importing. */
export function isRowNumberHeader(header: string): boolean {
  return /^(n[º°o]?\.?|#|item|nro\.?)$/i.test(header.trim());
}

const fold = (text: string) => rosterNameKey(text);

/** "15/03/2026", "2026-03-15" → "2026-03-15"; anything else → undefined. */
function toIsoDate(raw: string): string | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
  if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  return undefined;
}

/**
 * A list cell as the starting answer of a question, in the shape the
 * answers schema expects. Choice questions take the option that matches
 * ignoring accents and case; a value that fits no option, or a cell that
 * is empty, leaves the question empty for the person to fill.
 */
export function rosterPrefillValue(field: FormField, raw: string | undefined): unknown {
  const value = raw?.trim();
  if (!value) return undefined;
  switch (field.type) {
    case "short_text":
    case "long_text":
    case "phone":
    case "id_number":
      return value;
    case "email":
      return value.toLowerCase();
    case "number": {
      const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? String(parsed) : undefined;
    }
    case "date":
      return toIsoDate(value);
    case "select":
    case "radio":
      return field.options.find((option) => fold(option) === fold(value));
    case "checkboxes": {
      const picked = value
        .split(/[,;/]/)
        .map((part) => field.options.find((option) => fold(option) === fold(part)))
        .filter((option): option is string => Boolean(option));
      return picked.length > 0 ? [...new Set(picked)] : undefined;
    }
    default:
      return undefined;
  }
}

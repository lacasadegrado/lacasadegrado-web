import { parseDelimited } from "@/modules/forms/lib/utils/roster.util";

export type Sheet = { name: string; rows: string[][] };

/** One cell as text: formulas give their result, dates become YYYY-MM-DD. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const cell = value as { result?: unknown; text?: unknown; richText?: { text: string }[]; error?: unknown };
    if (cell.richText)
      return cell.richText
        .map((part) => part.text)
        .join("")
        .trim();
    if ("result" in cell) return cellText(cell.result);
    if (typeof cell.text === "string") return cell.text.trim();
    return "";
  }
  return String(value).trim();
}

/** Excel in the browser (exceljs loaded only when needed), CSV as text. */
export async function readSheets(file: File): Promise<Sheet[]> {
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    return [{ name: file.name, rows: parseDelimited(await file.text()) }];
  }
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  return workbook.worksheets.map((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, number) => {
      const cells = Array.from({ length: row.cellCount }, (_, index) => cellText(row.getCell(index + 1).value));
      rows[number - 1] = cells;
    });
    return { name: sheet.name, rows: Array.from(rows, (row) => row ?? []) };
  });
}

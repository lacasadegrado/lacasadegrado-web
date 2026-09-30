import ExcelJS from "exceljs";

import { toCaracasWallClock } from "@/common/lib/utils/date.util";
import type { FormField } from "@/modules/forms/lib/types/form.types";

import { ADMIN_PATHS } from "../constants/admin.constants";
import type { PackagePaymentExportRow, PackagePaymentSummary } from "../types/package-payment.types";
import { answerText, fileAnswers } from "./package-payment.util";

const EUR_FORMAT = '#,##0.00 "€"';
const LINK_FONT = { color: { argb: "FF135065" }, underline: true } as const;

/**
 * The admin's own questions across every exported answer, in the order
 * they first appear. A field keeps the label of its newest version, so a
 * renamed question stays one column.
 */
function customColumns(rows: PackagePaymentExportRow[]): FormField[] {
  const byId = new Map<string, FormField>();
  for (const row of rows) {
    for (const field of row.fields) {
      if (!field.system) byId.set(field.id, field);
    }
  }
  return [...byId.values()];
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/**
 * Two sheets: every answer (links point at app routes, which ask for an
 * admin session, so the file can be kept and shared without exposing any
 * proof) and a per-package summary.
 */
export async function buildPackagePaymentsWorkbook(
  rows: PackagePaymentExportRow[],
  summary: PackagePaymentSummary[],
  appUrl: string,
): Promise<ArrayBuffer> {
  const absolute = (path: string) => new URL(path, appUrl).toString();
  const extra = customColumns(rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "La Casa de Grado";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Respuestas");
  sheet.columns = [
    { header: "Fecha", key: "date", width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Evento", key: "event", width: 24 },
    { header: "Formulario", key: "form", width: 28 },
    { header: "Paquete", key: "package", width: 22 },
    { header: "Precio", key: "price", width: 12, style: { numFmt: EUR_FORMAT } },
    { header: "Correo", key: "email", width: 30 },
    { header: "Referencia", key: "reference", width: 18 },
    { header: "Comprobante", key: "proof", width: 18 },
    { header: "Detalle", key: "detail", width: 14 },
    ...extra.map((field) => ({ header: field.label, key: `f:${field.id}`, width: 24 })),
  ];

  for (const row of rows) {
    const values: Record<string, ExcelJS.CellValue> = {
      date: toCaracasWallClock(row.submittedAt),
      event: row.eventName,
      form: row.formTitle,
      package: row.packageName,
      price: row.packagePriceCents / 100,
      email: row.email,
      // Text, so Excel keeps leading zeros of bank references.
      reference: row.reference,
      proof: { text: "Ver comprobante", hyperlink: absolute(ADMIN_PATHS.packagePaymentFileApi(row.id, "proof", 0)) },
      detail: { text: "Ver respuesta", hyperlink: absolute(ADMIN_PATHS.packagePayment(row.id)) },
    };

    for (const field of extra) {
      const own = row.fields.find((item) => item.id === field.id);
      const value = row.answers[field.id];
      if (!own) continue;
      if (own.type === "file") {
        const files = fileAnswers(value);
        if (files.length > 0) {
          values[`f:${field.id}`] = {
            text: files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1} más)`,
            hyperlink: absolute(ADMIN_PATHS.packagePaymentFileApi(row.id, field.id, 0)),
          };
        }
        continue;
      }
      const text = answerText(own, value, row.packageName);
      values[`f:${field.id}`] = own.type === "number" && typeof value === "number" ? value : text;
    }

    const added = sheet.addRow(values);
    added.getCell("reference").numFmt = "@";
    for (const cell of [added.getCell("proof"), added.getCell("detail")]) cell.font = LINK_FONT;
    for (const field of extra) {
      const cell = added.getCell(`f:${field.id}`);
      if (typeof cell.value === "object" && cell.value && "hyperlink" in cell.value) cell.font = LINK_FONT;
    }
  }
  styleHeader(sheet);
  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  }

  const totals = workbook.addWorksheet("Resumen");
  totals.columns = [
    { header: "Paquete", key: "package", width: 26 },
    { header: "Precio", key: "price", width: 12, style: { numFmt: EUR_FORMAT } },
    { header: "Respuestas", key: "count", width: 12 },
    { header: "Total reportado", key: "total", width: 16, style: { numFmt: EUR_FORMAT } },
  ];
  for (const line of summary) {
    totals.addRow({ package: line.packageName, price: line.priceCents / 100, count: line.count, total: line.totalCents / 100 });
  }
  const totalRow = totals.addRow({
    package: "Total",
    count: summary.reduce((acc, line) => acc + line.count, 0),
    total: summary.reduce((acc, line) => acc + line.totalCents, 0) / 100,
  });
  totalRow.font = { bold: true };
  styleHeader(totals);

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

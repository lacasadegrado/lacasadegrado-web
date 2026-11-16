import "server-only";

import { NextResponse } from "next/server";

import { getServerEnv } from "@/common/lib/config/env.config";
import { toCaracasWallClock } from "@/common/lib/utils/date.util";

import { packagePaymentFiltersSchema, toPackagePaymentFilters } from "../schemas/package-payment.schema";
import { getAdminUser } from "../services/admin-access.service";
import { listPackagePaymentsForExport, summarizePackagePayments } from "../services/package-payment.service";
import { buildPackagePaymentsWorkbook } from "../utils/package-payment-workbook.util";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** GET /api/admin/package-payments/export?event=&form=&package=&q= (same filters as the list). */
export async function packagePaymentExportHandler(request: Request): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const params = packagePaymentFiltersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const filters = toPackagePaymentFilters(params);
  const [rows, summary] = await Promise.all([
    listPackagePaymentsForExport(filters),
    summarizePackagePayments(filters),
  ]);
  // Sign-ups carry no payment: they export like a general form's answers.
  const signups = params.kind === "package_payment" && params.entries === "signups";
  const layout = signups ? "general" : params.kind;
  const buffer = await buildPackagePaymentsWorkbook(rows, summary, getServerEnv().NEXT_PUBLIC_APP_URL, layout);
  const today = toCaracasWallClock(new Date()).toISOString().slice(0, 10);
  const prefix = signups ? "inscripciones" : params.kind === "general" ? "respuestas-formulario" : "pagos-paquetes";
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${prefix}-${today}.xlsx"`,
    },
  });
}

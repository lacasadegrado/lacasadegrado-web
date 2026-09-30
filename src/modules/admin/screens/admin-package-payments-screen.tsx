import { Download } from "lucide-react";
import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur } from "@/common/lib/utils/money.util";

import { PackagePaymentsFilters } from "../components/package-payments/package-payments-filters";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import {
  toPackagePaymentFilters,
  type PackagePaymentSearchParams,
} from "../lib/schemas/package-payment.schema";
import { listEvents } from "../lib/services/event.service";
import { listFormsForEvent } from "../lib/services/form.service";
import { listPackagesForEvent } from "../lib/services/package.service";
import {
  PACKAGE_PAYMENTS_PAGE_SIZE,
  listPackagePayments,
  summarizePackagePayments,
} from "../lib/services/package-payment.service";

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function AdminPackagePaymentsScreen({ params }: { params: PackagePaymentSearchParams }) {
  const filters = toPackagePaymentFilters(params);
  const [events, forms, packages, { rows, total }, summary] = await Promise.all([
    listEvents(),
    params.event ? listFormsForEvent(params.event) : Promise.resolve([]),
    params.event ? listPackagesForEvent(params.event) : Promise.resolve([]),
    listPackagePayments(filters, params.page),
    summarizePackagePayments(filters),
  ]);
  const current = { event: params.event, form: params.form, package: params.package, q: params.q };
  const pages = Math.max(1, Math.ceil(total / PACKAGE_PAYMENTS_PAGE_SIZE));
  const filtered = Boolean(params.event || params.form || params.package || params.q);
  const summaryCount = summary.reduce((acc, line) => acc + line.count, 0);
  const summaryTotal = summary.reduce((acc, line) => acc + line.totalCents, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagos de paquetes</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Respuestas de los formularios de paquetes prepagados. La app no verifica estos pagos:
            descarga el Excel y compáralo con el banco.
          </p>
        </div>
        {total > 0 ? (
          <Button asChild>
            <a href={`${ADMIN_PATHS.packagePaymentsExportApi}${queryString(current)}`} download>
              <Download aria-hidden="true" /> Descargar Excel
            </a>
          </Button>
        ) : (
          <Button type="button" disabled>
            <Download aria-hidden="true" /> Descargar Excel
          </Button>
        )}
      </div>

      <PackagePaymentsFilters
        events={events.map((event) => ({ id: event.id, label: `${event.name} · ${event.institution}` }))}
        forms={forms.map((form) => ({ id: form.id, label: form.title }))}
        packages={packages.map((pkg) => ({ id: pkg.id, name: pkg.name, priceCents: pkg.priceCents }))}
        current={current}
      />

      {summary.length > 0 ? (
        <section aria-labelledby="summary-heading" className="space-y-3">
          <h2 id="summary-heading" className="text-lg font-semibold">
            Resumen por paquete
          </h2>
          <div className="max-w-2xl overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paquete</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Respuestas</TableHead>
                  <TableHead className="text-right">Total reportado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((line) => (
                  <TableRow key={`${line.packageName}-${line.priceCents}`}>
                    <TableCell>{line.packageName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(line.priceCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(line.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{summaryCount}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatEur(summaryTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="answers-heading" className="space-y-3">
        <h2 id="answers-heading" className="text-lg font-semibold">
          {total === 1 ? "1 respuesta" : `${total} respuestas`}
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {filtered
              ? "Ninguna respuesta coincide con estos filtros."
              : "Todavía no hay respuestas. Aparecerán aquí cuando alguien llene un formulario abierto."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Paquete</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Formulario</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(row.submittedAt)}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.packageName}{" "}
                      <span className="text-muted-foreground tabular-nums">· {formatEur(row.packagePriceCents)}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-sm text-muted-foreground">
                      {row.formTitle}
                      <span className="block text-xs">{row.eventName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={ADMIN_PATHS.packagePaymentFileApi(row.id, "proof", 0)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Comprobante
                          </a>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={ADMIN_PATHS.packagePayment(row.id)}>Ver</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pages > 1 ? (
          <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              Página {params.page} de {pages}
            </p>
            <div className="flex gap-2">
              {params.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_PATHS.packagePayments}${queryString({ ...current, page: params.page - 1 })}`}>
                    Anterior
                  </Link>
                </Button>
              ) : null}
              {params.page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_PATHS.packagePayments}${queryString({ ...current, page: params.page + 1 })}`}>
                    Siguiente
                  </Link>
                </Button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

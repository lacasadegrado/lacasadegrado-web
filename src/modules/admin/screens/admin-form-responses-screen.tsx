import { ArrowLeft, Download, Search } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";

import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import type { PackagePaymentSearchParams } from "../lib/schemas/package-payment.schema";
import { getFormForBuilder } from "../lib/services/form.service";
import { PACKAGE_PAYMENTS_PAGE_SIZE, listPackagePayments } from "../lib/services/package-payment.service";
import { formResponsesHref } from "../lib/utils/form-links.util";

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

type AdminFormResponsesScreenProps = {
  formId: string;
  params: Pick<PackagePaymentSearchParams, "q" | "page">;
};

/**
 * Answers of one general form (Eventos › Formularios › Respuestas). Payment
 * forms keep theirs in Pagos › Paquetes and are redirected there.
 */
export async function AdminFormResponsesScreen({ formId, params }: AdminFormResponsesScreenProps) {
  if (!z.uuid().safeParse(formId).success) notFound();
  const form = await getFormForBuilder(formId);
  if (!form) notFound();
  if (form.kind !== "general") redirect(formResponsesHref(form));

  const { rows, total } = await listPackagePayments(
    { formId, kind: "general", query: params.q || undefined },
    params.page,
  );
  const pages = Math.max(1, Math.ceil(total / PACKAGE_PAYMENTS_PAGE_SIZE));
  const exportHref = `${ADMIN_PATHS.packagePaymentsExportApi}${queryString({ form: formId, kind: "general", q: params.q })}`;
  const listHref = ADMIN_PATHS.formResponses(formId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={ADMIN_PATHS.formBuilder(formId)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Editar {form.title}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Respuestas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.title} · {form.eventName}
            </p>
          </div>
          {total > 0 ? (
            <Button asChild>
              <a href={exportHref} download>
                <Download aria-hidden="true" /> Descargar Excel
              </a>
            </Button>
          ) : (
            <Button type="button" disabled>
              <Download aria-hidden="true" /> Descargar Excel
            </Button>
          )}
        </div>
      </div>

      <form role="search" action={listHref} className="flex max-w-md gap-2">
        <label htmlFor="responses-q" className="sr-only">
          Buscar por correo
        </label>
        <Input id="responses-q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} placeholder="Buscar por correo" />
        <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
          <Search aria-hidden="true" />
        </Button>
      </form>

      <section aria-labelledby="responses-heading" className="space-y-3">
        <h2 id="responses-heading" className="text-lg font-semibold">
          {total === 1 ? "1 respuesta" : `${total} respuestas`}
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {params.q
              ? "Ninguna respuesta coincide con esa búsqueda."
              : "Todavía no hay respuestas. Aparecerán aquí cuando alguien llene el formulario."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(row.submittedAt)}</TableCell>
                    <TableCell>{row.personName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{row.email ?? <span className="text-muted-foreground">Sin correo</span>}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={ADMIN_PATHS.formResponse(formId, row.id)}>Ver</Link>
                      </Button>
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
                  <Link href={`${listHref}${queryString({ q: params.q, page: params.page - 1 })}`}>Anterior</Link>
                </Button>
              ) : null}
              {params.page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${listHref}${queryString({ q: params.q, page: params.page + 1 })}`}>Siguiente</Link>
                </Button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

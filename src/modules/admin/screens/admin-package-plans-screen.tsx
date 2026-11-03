import { Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur } from "@/common/lib/utils/money.util";

import { PlanProgress } from "../components/package-payments/plan-progress";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import type { PackagePlanSearchParams } from "../lib/schemas/package-plan.schema";
import { listEvents } from "../lib/services/event.service";
import { PACKAGE_PLANS_PAGE_SIZE, listPackagePlans } from "../lib/services/package-review.service";

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

const STATUS_OPTIONS = [
  { value: "open", label: "Con saldo pendiente" },
  { value: "paid", label: "Pagados" },
  { value: "all", label: "Todos" },
] as const;

/**
 * Abonos: one row per person and package with how much is confirmed and
 * under review. Plans with payments to review come first.
 */
export async function AdminPackagePlansScreen({ params }: { params: PackagePlanSearchParams }) {
  const [{ rows, total }, events] = await Promise.all([
    listPackagePlans(
      { eventId: params.event, status: params.status === "all" ? undefined : params.status, query: params.q },
      params.page,
    ),
    listEvents(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PACKAGE_PLANS_PAGE_SIZE));
  const current = { event: params.event, status: params.status === "open" ? undefined : params.status, q: params.q };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Abonos</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Cada persona que paga un paquete, con lo confirmado y lo que espera revisión. Abre una para ver
          sus pagos y confirmarlos.
        </p>
      </div>

      <form role="search" action={ADMIN_PATHS.packagePlans} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_1fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="plans-status">Estado</Label>
          <NativeSelect id="plans-status" name="status" defaultValue={params.status}>
            {STATUS_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plans-event">Evento</Label>
          <NativeSelect id="plans-event" name="event" defaultValue={params.event ?? ""}>
            <NativeSelectOption value="">Todos los eventos</NativeSelectOption>
            {events.map((event) => (
              <NativeSelectOption key={event.id} value={event.id}>
                {event.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plans-q">Persona</Label>
          <Input id="plans-q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} placeholder="Correo o nombre" />
        </div>
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" /> Filtrar
        </Button>
      </form>

      <section aria-labelledby="plans-heading" className="space-y-3">
        <h2 id="plans-heading" className="text-lg font-semibold">
          {total === 1 ? "1 plan" : `${total} planes`}
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {params.q || params.event || params.status !== "open"
              ? "Ningún plan coincide con esos filtros."
              : "Nadie tiene saldo pendiente. Los planes aparecen cuando alguien reporta su primer pago de un paquete."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Paquete</TableHead>
                  <TableHead className="min-w-48">Avance</TableHead>
                  <TableHead>Último pago</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.personName ?? row.email ?? "Sin correo"}</div>
                      {row.personName && row.email ? <div className="text-xs text-muted-foreground">{row.email}</div> : null}
                    </TableCell>
                    <TableCell>
                      {row.packageName}
                      <div className="text-xs text-muted-foreground">{row.eventName}</div>
                    </TableCell>
                    <TableCell className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
                        <span>
                          {formatEur(row.confirmedCents)} de {formatEur(row.priceCents)}
                        </span>
                        {row.status === "paid" ? (
                          <Badge>Pagado</Badge>
                        ) : row.pendingCount > 0 ? (
                          <Badge variant="secondary">{row.pendingCount} por revisar</Badge>
                        ) : null}
                      </div>
                      <PlanProgress confirmedCents={row.confirmedCents} pendingCents={row.pendingCents} priceCents={row.priceCents} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                      {row.lastPaymentAt ? formatDateTime(row.lastPaymentAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={ADMIN_PATHS.packagePlan(row.id)}>Ver</Link>
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
                  <Link href={`${ADMIN_PATHS.packagePlans}${queryString({ ...current, page: params.page - 1 })}`}>Anterior</Link>
                </Button>
              ) : null}
              {params.page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_PATHS.packagePlans}${queryString({ ...current, page: params.page + 1 })}`}>Siguiente</Link>
                </Button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

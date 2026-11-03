import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/common/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { ORDER_STATUS_LABELS } from "@/modules/orders/lib/constants/orders.constants";

import { DashboardFilters } from "../components/dashboard/dashboard-filters";
import { RevenueChart } from "../components/dashboard/revenue-chart";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { DASHBOARD_RANGES, type DashboardRange } from "../lib/constants/dashboard.constants";
import { PAYMENT_METHOD_LABELS } from "../lib/constants/sale.constants";
import { getDashboardData } from "../lib/services/dashboard.service";
import { listEvents } from "../lib/services/event.service";
import type { PersonLine } from "../lib/types/dashboard.types";

/** Bolívar cents (already converted at each payment's rate) as "Bs. 1.234,50". */
const bs = (cents: number) => formatVes(cents, 1);

function Kpi({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function PeopleList({ people, empty, format }: { people: PersonLine[]; empty: string; format: (value: number) => string }) {
  if (people.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y text-sm">
      {people.map((person) => (
        <li key={person.email} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            {person.profileId ? (
              <Link href={ADMIN_PATHS.user(person.profileId)} className="block truncate underline-offset-4 hover:underline">
                {person.name ?? person.email}
              </Link>
            ) : (
              <span className="block truncate">{person.name ?? person.email}</span>
            )}
            {person.name ? <span className="block truncate text-xs text-muted-foreground">{person.email}</span> : null}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{format(person.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * `/admin`: how the business is doing in a period. Money is only what an
 * admin confirmed (approved photo orders and confirmed package payments);
 * the "Por atender" row is the current state, whatever the period.
 */
export async function AdminDashboardScreen({ range, eventId }: { range: DashboardRange; eventId?: string }) {
  const [data, events] = await Promise.all([getDashboardData(range, eventId), listEvents()]);
  const { kpis, pending } = data;
  const rangeLabel = DASHBOARD_RANGES.find((option) => option.value === range)?.label ?? "";
  const statusTotal = data.ordersByStatus.reduce((acc, line) => acc + line.count, 0);
  const methodTotal = data.methods.reduce((acc, line) => acc + line.cents, 0);
  const hasRevenue = data.revenueSeries.some((point) => point.photos > 0 || point.packages > 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Lo que entró es solo lo confirmado: pedidos de fotos aprobados y pagos de paquetes
            confirmados. Los bolívares usan la tasa del día de cada pago.
          </p>
        </div>
        <DashboardFilters range={range} eventId={eventId} events={events.map((event) => ({ id: event.id, name: event.name }))} />
      </div>

      <section aria-labelledby="pending-heading" className="space-y-3">
        <h2 id="pending-heading" className="text-lg font-semibold">
          Por atender
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={ADMIN_PATHS.payments} className="group rounded-lg border p-4 hover:bg-muted">
            <p className="text-sm text-muted-foreground">Pagos de fotos por revisar</p>
            <p className="mt-1 flex items-center justify-between text-2xl font-semibold tabular-nums">
              {pending.orders.count}
              <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-foreground" />
            </p>
            <p className="text-xs text-muted-foreground">
              {pending.orders.count > 0
                ? `${formatEur(pending.orders.cents)} · el más antiguo del ${formatDateTime(pending.orders.oldestAt as Date)}`
                : "Nada pendiente"}
            </p>
          </Link>
          <Link
            href={`${ADMIN_PATHS.packagePayments}?status=pending`}
            className="group rounded-lg border p-4 hover:bg-muted"
          >
            <p className="text-sm text-muted-foreground">Pagos de paquetes por revisar</p>
            <p className="mt-1 flex items-center justify-between text-2xl font-semibold tabular-nums">
              {pending.packagePayments.count}
              <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-foreground" />
            </p>
            <p className="text-xs text-muted-foreground">
              {pending.packagePayments.count > 0
                ? `${formatEur(pending.packagePayments.cents)} · el más antiguo del ${formatDateTime(pending.packagePayments.oldestAt as Date)}`
                : "Nada pendiente"}
            </p>
          </Link>
          <Link href={ADMIN_PATHS.prints} className="group rounded-lg border p-4 hover:bg-muted">
            <p className="text-sm text-muted-foreground">Impresiones por entregar</p>
            <p className="mt-1 flex items-center justify-between text-2xl font-semibold tabular-nums">
              {pending.prints.pending}
              <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-foreground" />
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {pending.prints.late > 0 ? (
                <>
                  <AlertTriangle aria-hidden="true" className="size-3.5 text-amber" />
                  {pending.prints.late} con más de 5 días
                </>
              ) : (
                "Ninguna atrasada"
              )}
            </p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="kpi-heading" className="space-y-3">
        <h2 id="kpi-heading" className="text-lg font-semibold">
          {rangeLabel}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Ingresos confirmados"
            value={formatEur(kpis.revenue.eur)}
            hint={
              <>
                {bs(kpis.revenue.ves)} · fotos {formatEur(kpis.photoRevenue.eur)} · paquetes {formatEur(kpis.packageRevenue.eur)}
              </>
            }
          />
          <Kpi
            label="Pedidos de fotos aprobados"
            value={String(kpis.ordersPaid)}
            hint={kpis.averageOrderCents !== null ? `Promedio ${formatEur(kpis.averageOrderCents)} por pedido` : "Sin pedidos aprobados"}
          />
          <Kpi
            label="Fotos vendidas"
            value={String(kpis.photosSold.digital + kpis.photosSold.print)}
            hint={`${kpis.photosSold.digital} digitales · ${kpis.photosSold.print} impresas`}
          />
          <Kpi
            label="Pagos de paquetes confirmados"
            value={String(kpis.packagePaymentsConfirmed)}
            hint={`${kpis.packagesFullyPaid} paquete${kpis.packagesFullyPaid === 1 ? "" : "s"} pagado${kpis.packagesFullyPaid === 1 ? "" : "s"} completo${kpis.packagesFullyPaid === 1 ? "" : "s"} · ${kpis.newUsers} persona${kpis.newUsers === 1 ? "" : "s"} nueva${kpis.newUsers === 1 ? "" : "s"}`}
          />
        </dl>
      </section>

      <section aria-labelledby="revenue-heading" className="space-y-3 rounded-lg border p-4">
        <h2 id="revenue-heading" className="font-semibold">
          Ingresos confirmados por {data.range.bucket === "day" ? "día" : data.range.bucket === "week" ? "semana" : "mes"}
        </h2>
        {hasRevenue ? (
          <RevenueChart data={data.revenueSeries} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No entró dinero confirmado en este período.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="status-heading" className="space-y-3 rounded-lg border p-4">
          <h2 id="status-heading" className="font-semibold">
            Pedidos creados en el período
          </h2>
          {statusTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No se crearon pedidos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.ordersByStatus.map((line) => (
                <li key={line.status} className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span>{ORDER_STATUS_LABELS[line.status]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {line.count} · {formatEur(line.cents)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full bg-primary" style={{ width: percent(line.count, statusTotal) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="methods-heading" className="space-y-3 rounded-lg border p-4">
          <h2 id="methods-heading" className="font-semibold">
            Métodos de pago (pedidos aprobados)
          </h2>
          {data.methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos aprobados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.methods.map((line) => (
                <li key={line.method} className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span>{PAYMENT_METHOD_LABELS[line.method] ?? line.method}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {line.count} · {formatEur(line.cents)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full bg-amber" style={{ width: percent(line.cents, methodTotal) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="events-heading" className="space-y-3">
        <div>
          <h2 id="events-heading" className="text-lg font-semibold">
            Por evento
          </h2>
          <p className="text-sm text-muted-foreground">
            Fotos, etiquetas y compradores son del evento completo; ventas y paquetes, del período.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="text-right">Fotos</TableHead>
                <TableHead className="text-right">Etiquetadas</TableHead>
                <TableHead className="text-right">Personas</TableHead>
                <TableHead className="text-right">Compraron</TableHead>
                <TableHead className="text-right">Vendidas</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Paquetes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Link href={`${ADMIN_PATHS.sales}?event=${event.id}`} className="font-medium underline-offset-4 hover:underline">
                      {event.name}
                    </Link>
                    {!event.isActive ? (
                      <Badge variant="outline" className="ml-2">
                        Inactivo
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{event.photos}</TableCell>
                  <TableCell className="text-right tabular-nums">{percent(event.taggedPhotos, event.photos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{event.peopleTagged}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.buyers}
                    <span className="block text-xs text-muted-foreground">{percent(event.buyers, event.peopleTagged)}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.photosSold}
                    {event.printsSold > 0 ? (
                      <span className="block text-xs text-muted-foreground">{event.printsSold} impresas</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEur(event.revenueCents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEur(event.packagesConfirmedCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="remind-heading" className="space-y-2 rounded-lg border p-4">
          <h2 id="remind-heading" className="font-semibold">
            Etiquetados que no han comprado
          </h2>
          <p className="text-xs text-muted-foreground">
            {data.toRemind.total} persona{data.toRemind.total === 1 ? "" : "s"} con fotos y sin compras: a quién recordarle.
          </p>
          <PeopleList
            people={data.toRemind.people}
            empty="Todos los etiquetados ya compraron."
            format={(value) => `${value} foto${value === 1 ? "" : "s"}`}
          />
        </section>
        <section aria-labelledby="never-heading" className="space-y-2 rounded-lg border p-4">
          <h2 id="never-heading" className="font-semibold">
            Compraron y no han descargado
          </h2>
          <p className="text-xs text-muted-foreground">
            {data.neverDownloaded.total} persona{data.neverDownloaded.total === 1 ? "" : "s"} sin ninguna descarga.
          </p>
          <PeopleList
            people={data.neverDownloaded.people}
            empty="Todos los compradores descargaron algo."
            format={(value) => `${value} foto${value === 1 ? "" : "s"}`}
          />
        </section>
        <section aria-labelledby="buyers-heading" className="space-y-2 rounded-lg border p-4">
          <h2 id="buyers-heading" className="font-semibold">
            Quienes más compraron
          </h2>
          <p className="text-xs text-muted-foreground">Fotos aprobadas en el período.</p>
          <PeopleList people={data.topBuyers} empty="Sin compras en el período." format={formatEur} />
        </section>
      </div>

      {data.rejections.length > 0 ? (
        <section aria-labelledby="rejections-heading" className="space-y-2 rounded-lg border p-4">
          <h2 id="rejections-heading" className="font-semibold">
            Motivos de rechazo en el período
          </h2>
          <ul className="divide-y text-sm">
            {data.rejections.map((line) => (
              <li key={line.reason} className="flex justify-between gap-3 py-2">
                <span>{line.reason}</span>
                <span className="tabular-nums text-muted-foreground">{line.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

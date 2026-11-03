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
import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { ORDER_STATUS_LABELS } from "@/modules/orders/lib/constants/orders.constants";

import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { PAYMENT_METHOD_LABELS, SALE_STATUS_BADGE, SALES_STATUS_FILTERS } from "../lib/constants/sale.constants";
import type { SalesSearchParams } from "../lib/schemas/sale.schema";
import { listEvents } from "../lib/services/event.service";
import { SALES_PAGE_SIZE, listSales } from "../lib/services/sale.service";

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Ventas: every order with its buyer, photos and total. Approved by
 * default; the filters live in the query string so a view can be shared.
 */
export async function AdminSalesScreen({ params }: { params: SalesSearchParams }) {
  const [{ rows, total, totals }, events] = await Promise.all([listSales(params), listEvents()]);
  const pages = Math.max(1, Math.ceil(total / SALES_PAGE_SIZE));
  const filters = { status: params.status === "paid" ? undefined : params.status, event: params.event, q: params.q };
  const statusLabel = SALES_STATUS_FILTERS.find((item) => item.value === params.status)?.label ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ventas</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Cada pedido con quién compró, qué fotos y cuánto pagó. Abre uno para ver las fotos, los
          pagos reportados y las descargas.
        </p>
      </div>

      <form role="search" action={ADMIN_PATHS.sales} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_1fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="sales-status">Estado</Label>
          <NativeSelect id="sales-status" name="status" defaultValue={params.status}>
            {SALES_STATUS_FILTERS.map((item) => (
              <NativeSelectOption key={item.value} value={item.value}>
                {item.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sales-event">Evento</Label>
          <NativeSelect id="sales-event" name="event" defaultValue={params.event ?? ""}>
            <NativeSelectOption value="">Todos los eventos</NativeSelectOption>
            {events.map((event) => (
              <NativeSelectOption key={event.id} value={event.id}>
                {event.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sales-q">Comprador</Label>
          <Input id="sales-q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} placeholder="Correo o nombre" />
        </div>
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" /> Filtrar
        </Button>
      </form>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">Pedidos · {statusLabel.toLowerCase()}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{totals.count}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">Monto</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatEur(totals.totalCents)}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">Fotos</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{totals.photos}</dd>
        </div>
      </dl>

      <section aria-labelledby="sales-heading" className="space-y-3">
        <h2 id="sales-heading" className="sr-only">
          Pedidos
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {params.q || params.event || params.status !== "paid"
              ? "Ningún pedido coincide con esos filtros."
              : "Todavía no hay ventas aprobadas. Aparecerán aquí cuando apruebes un pago."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Fotos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDateTime(row.paidAt ?? row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.buyerName ?? row.buyerEmail}</div>
                      {row.buyerName ? <div className="text-xs text-muted-foreground">{row.buyerEmail}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-56">
                      <span className="line-clamp-2">{row.eventNames.join(", ") || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.itemCount}
                      {row.printCount > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {row.printCount} impresa{row.printCount === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      <div className="font-medium">{formatEur(row.totalCents)}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.eurToVes ? formatVes(row.totalCents, row.eurToVes) : PAYMENT_METHOD_LABELS[row.method]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SALE_STATUS_BADGE[row.status]}>{ORDER_STATUS_LABELS[row.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={ADMIN_PATHS.sale(row.orderId)}>Ver</Link>
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
                  <Link href={`${ADMIN_PATHS.sales}${queryString({ ...filters, page: params.page - 1 })}`}>Anterior</Link>
                </Button>
              ) : null}
              {params.page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_PATHS.sales}${queryString({ ...filters, page: params.page + 1 })}`}>Siguiente</Link>
                </Button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

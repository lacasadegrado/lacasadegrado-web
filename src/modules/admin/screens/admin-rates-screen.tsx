import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatRate } from "@/common/lib/utils/money.util";
import { EXCHANGE_RATE } from "@/modules/checkout/lib/constants/checkout.constants";
import { fetchDolarApiRates, type DolarApiRate } from "@/modules/checkout/lib/services/dolarapi.service";
import { getRateStatus, listRecentRates } from "@/modules/checkout/lib/services/exchange-rate.service";

import { RateForm } from "../components/rate-form";

const SOURCE_LABELS = {
  manual: "Manual",
  dolarapi_oficial: "DolarApi · BCV oficial",
  dolarapi_paralelo: "DolarApi · paralelo",
} as const;

export async function AdminRatesScreen() {
  const [{ latest, isStale: stale }, history, apiRates] = await Promise.all([
    getRateStatus(),
    listRecentRates(10),
    fetchDolarApiRates().catch((): DolarApiRate[] => []),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tasa de cambio</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          El precio en bolívares se calcula con la tasa vigente al crear cada pedido. Si la tasa
          guardada tiene más de {EXCHANGE_RATE.maxAgeMs / 3_600_000} horas, el sistema consulta
          DolarApi automáticamente al momento del pago.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-labelledby="current-heading" className="space-y-5">
          <div className="rounded-md border p-4">
            <h2 id="current-heading" className="text-sm text-muted-foreground">
              Tasa vigente
            </h2>
            {latest ? (
              <>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">
                  {formatRate(latest.usdToVes)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {SOURCE_LABELS[latest.source]} · {formatDateTime(latest.effectiveAt)}
                  {stale ? " · se actualizará sola en el próximo pago" : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-base font-medium">
                Todavía no hay tasa. Sin tasa no se pueden crear pedidos.
              </p>
            )}
          </div>

          {apiRates.length > 0 ? (
            <div className="rounded-md border p-4">
              <h2 className="text-sm text-muted-foreground">Referencia DolarApi ahora</h2>
              <dl className="mt-2 space-y-1 text-sm">
                {apiRates.map((rate) => (
                  <div key={rate.source} className="flex justify-between gap-3">
                    <dt className="capitalize">{rate.source === "oficial" ? "BCV oficial" : "Paralelo"}</dt>
                    <dd className="tabular-nums">{formatRate(rate.usdToVes)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">DolarApi no respondió en este momento.</p>
          )}

          <RateForm />
        </section>

        <section aria-labelledby="history-heading" className="space-y-4">
          <h2 id="history-heading" className="text-lg font-semibold">
            Historial
          </h2>
          {history.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Sin registros todavía.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Tasa</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(row.effectiveAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(Number(row.usdToVes))}
                      </TableCell>
                      <TableCell>{SOURCE_LABELS[row.source]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

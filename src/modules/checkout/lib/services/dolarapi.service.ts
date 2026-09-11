import "server-only";

import { z } from "zod";

import { EXCHANGE_RATE } from "../constants/checkout.constants";

const quoteSchema = z.object({
  fuente: z.string(),
  promedio: z.number().positive().nullable(),
  fechaActualizacion: z.string(),
});

export type DolarApiRate = {
  source: "oficial" | "paralelo";
  usdToVes: number;
  updatedAt: Date;
};

/**
 * DolarApi Venezuela (https://dolarapi.com/docs/venezuela/). Unofficial
 * aggregator; we only take `promedio`. Never cached by Next: the caller
 * decides freshness against the stored rate.
 */
export async function fetchDolarApiRates(): Promise<DolarApiRate[]> {
  const response = await fetch(EXCHANGE_RATE.apiUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(EXCHANGE_RATE.apiTimeoutMs),
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`DolarApi responded ${response.status}`);

  const parsed = z.array(quoteSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("DolarApi payload did not match the expected shape");

  return parsed.data
    .filter(
      (quote): quote is typeof quote & { promedio: number } =>
        (quote.fuente === "oficial" || quote.fuente === "paralelo") && quote.promedio !== null,
    )
    .map((quote) => ({
      source: quote.fuente as "oficial" | "paralelo",
      usdToVes: quote.promedio,
      updatedAt: new Date(quote.fechaActualizacion),
    }));
}

export async function fetchDolarApiRate(
  source: "oficial" | "paralelo" = EXCHANGE_RATE.apiSource,
): Promise<DolarApiRate> {
  const rate = (await fetchDolarApiRates()).find((item) => item.source === source);
  if (!rate) throw new Error(`DolarApi has no "${source}" quote`);
  return rate;
}

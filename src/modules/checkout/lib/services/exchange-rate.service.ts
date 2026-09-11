import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { exchangeRates, type ExchangeRateSource } from "@/common/lib/db/schema";

import { EXCHANGE_RATE } from "../constants/checkout.constants";
import type { CurrentRate } from "../types/checkout.types";
import { fetchDolarApiRate } from "./dolarapi.service";

function toCurrentRate(row: {
  usdToVes: string;
  effectiveAt: Date;
  source: ExchangeRateSource;
}): CurrentRate {
  return { usdToVes: Number(row.usdToVes), effectiveAt: row.effectiveAt, source: row.source };
}

export async function getLatestRate(): Promise<CurrentRate | null> {
  const [row] = await db
    .select({
      usdToVes: exchangeRates.usdToVes,
      effectiveAt: exchangeRates.effectiveAt,
      source: exchangeRates.source,
    })
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.effectiveAt))
    .limit(1);
  return row ? toCurrentRate(row) : null;
}

export function isRateStale(rate: CurrentRate, now: number = Date.now()): boolean {
  return now - rate.effectiveAt.getTime() >= EXCHANGE_RATE.maxAgeMs;
}

/** Latest stored rate plus whether checkout would refresh it. */
export async function getRateStatus(): Promise<{ latest: CurrentRate | null; isStale: boolean }> {
  const latest = await getLatestRate();
  return { latest, isStale: latest ? isRateStale(latest) : false };
}

export async function listRecentRates(limit = 10) {
  return db
    .select({
      id: exchangeRates.id,
      usdToVes: exchangeRates.usdToVes,
      effectiveAt: exchangeRates.effectiveAt,
      source: exchangeRates.source,
      createdBy: exchangeRates.createdBy,
    })
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.effectiveAt))
    .limit(limit);
}

export async function insertRate(input: {
  usdToVes: number;
  source: ExchangeRateSource;
  createdBy: string | null;
}): Promise<CurrentRate> {
  const [row] = await db
    .insert(exchangeRates)
    .values({
      usdToVes: input.usdToVes.toFixed(4),
      source: input.source,
      createdBy: input.createdBy,
    })
    .returning({
      usdToVes: exchangeRates.usdToVes,
      effectiveAt: exchangeRates.effectiveAt,
      source: exchangeRates.source,
    });
  return toCurrentRate(row);
}

/** Pulls the official quote from DolarApi and stores it as the current rate. */
export async function refreshRateFromApi(createdBy: string | null): Promise<CurrentRate> {
  const api = await fetchDolarApiRate(EXCHANGE_RATE.apiSource);
  return insertRate({ usdToVes: api.usdToVes, source: "dolarapi_oficial", createdBy });
}

/**
 * The rate checkout should use. A manual or fetched rate younger than
 * `maxAgeMs` wins. Otherwise we try DolarApi and store the result, and
 * fall back to the stale stored rate if the API is unreachable.
 */
export async function getCurrentRate(): Promise<CurrentRate | null> {
  const latest = await getLatestRate();
  if (latest && !isRateStale(latest)) return latest;
  try {
    return await refreshRateFromApi(null);
  } catch (error) {
    console.warn("[rates] DolarApi refresh failed, using stored rate", {
      message: error instanceof Error ? error.message : String(error),
      hasStored: Boolean(latest),
    });
    return latest;
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { formatRate } from "@/common/lib/utils/money.util";
import { manualRateSchema } from "@/modules/checkout/lib/schemas/checkout.schema";
import { insertRate, refreshRateFromApi } from "@/modules/checkout/lib/services/exchange-rate.service";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { requireAdmin } from "../services/admin-access.service";
import type { ActionState } from "../types/admin.types";

export async function setManualRateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = manualRateSchema.safeParse({
    eurToVes: String(formData.get("eurToVes") ?? "").replace(",", "."),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Escribe una tasa válida.",
    };
  }

  const rate = await insertRate({
    eurToVes: parsed.data.eurToVes,
    source: "manual",
    createdBy: admin.id,
  });
  revalidatePath(ADMIN_PATHS.rates);
  return { status: "success", message: `Tasa fijada en ${formatRate(rate.eurToVes)}.` };
}

export async function refreshRateAction(): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const rate = await refreshRateFromApi(admin.id);
    revalidatePath(ADMIN_PATHS.rates);
    return {
      status: "success",
      message: `Tasa actualizada desde DolarApi: ${formatRate(rate.eurToVes)}.`,
    };
  } catch (error) {
    console.error("[rates] manual refresh failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "error",
      message: "No pudimos consultar DolarApi. Intenta de nuevo o fija la tasa a mano.",
    };
  }
}

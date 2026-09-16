"use server";

import { revalidatePath } from "next/cache";

import { eurToCents } from "@/common/lib/utils/money.util";

import { ADMIN_PATHS } from "../constants/admin.constants";
import {
  bulkDeleteSchema,
  bulkPriceSchema,
  bulkTagPhotosSchema,
  deletePhotoSchema,
  removeTagSchema,
  tagPhotoSchema,
  updatePhotoPriceSchema,
} from "../schemas/admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import {
  addTag,
  bulkDeletePhotos,
  bulkTagPhotos,
  bulkUpdatePrice,
  deletePhoto,
  removeTag,
  updatePhotoPrice,
} from "../services/photo.service";
import type { ActionState, BulkActionOutcome } from "../types/admin.types";
import { parseEmailList } from "../utils/email-list.util";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export async function tagPhotoAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = tagPhotoSchema.safeParse({
    photoId: formData.get("photoId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Escribe un correo válido." };
  }

  const { created } = await addTag(parsed.data.photoId, parsed.data.email);
  revalidatePath(ADMIN_PATHS.photos);
  return created
    ? { status: "success" }
    : { status: "error", message: "Ese correo ya está en esta foto." };
}

export async function updatePhotoPriceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = updatePhotoPriceSchema.safeParse({
    photoId: formData.get("photoId"),
    priceEur: String(formData.get("priceEur") ?? "").replace(",", "."),
    printPriceEur: String(formData.get("printPriceEur") ?? "").replace(",", "."),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Escribe un precio válido.",
    };
  }

  const updated = await updatePhotoPrice(parsed.data.photoId, {
    priceCents: eurToCents(parsed.data.priceEur),
    printPriceCents: eurToCents(parsed.data.printPriceEur),
  });
  if (!updated) return { status: "error", message: "No encontramos la foto." };

  revalidatePath(ADMIN_PATHS.photos);
  return { status: "success", message: "Precios guardados." };
}

export async function deletePhotoAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = deletePhotoSchema.safeParse({ photoId: formData.get("photoId") });
  if (!parsed.success) return { status: "error", message: "Foto no válida." };

  const result = await deletePhoto(parsed.data.photoId);
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "has_orders"
          ? "Esta foto está en un pedido y no se puede borrar."
          : "No encontramos la foto.",
    };
  }

  revalidatePath(ADMIN_PATHS.photos);
  revalidatePath(ADMIN_PATHS.events);
  return { status: "success", message: "Foto eliminada." };
}

export async function removeTagAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = removeTagSchema.safeParse({ tagId: formData.get("tagId") });
  if (!parsed.success) return;

  await removeTag(parsed.data.tagId);
  revalidatePath(ADMIN_PATHS.photos);
}

/* ---------------- Selection-based bulk actions ---------------- */

export async function bulkTagPhotosAction(input: {
  photoIds: string[];
  emails: string;
}): Promise<BulkActionOutcome> {
  await requireAdmin();

  const parsed = bulkTagPhotosSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la selección." };
  }

  const { emails, invalid } = parseEmailList(parsed.data.emails);
  if (emails.length === 0) {
    return { ok: false, message: "Ninguno de los correos es válido." };
  }

  const result = await bulkTagPhotos(parsed.data.photoIds, emails, invalid);
  revalidatePath(ADMIN_PATHS.photos);
  return {
    ok: true,
    result,
    message: `${plural(result.affected, "etiqueta nueva", "etiquetas nuevas")} en ${plural(parsed.data.photoIds.length, "foto", "fotos")}${result.skipped > 0 ? `, ${result.skipped} ya existían` : ""}.`,
  };
}

export async function bulkUpdatePriceAction(input: {
  photoIds: string[];
  priceEur: string;
  printPriceEur: string;
}): Promise<BulkActionOutcome> {
  await requireAdmin();

  const parsed = bulkPriceSchema.safeParse({
    photoIds: input.photoIds,
    priceEur: input.priceEur.replace(",", "."),
    printPriceEur: input.printPriceEur.replace(",", "."),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el precio." };
  }

  const result = await bulkUpdatePrice(parsed.data.photoIds, {
    priceCents: eurToCents(parsed.data.priceEur),
    printPriceCents: eurToCents(parsed.data.printPriceEur),
  });
  revalidatePath(ADMIN_PATHS.photos);
  return {
    ok: true,
    result,
    message: `Precios actualizados en ${plural(result.affected, "foto", "fotos")}.`,
  };
}

export async function bulkDeletePhotosAction(input: {
  photoIds: string[];
}): Promise<BulkActionOutcome> {
  await requireAdmin();

  const parsed = bulkDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la selección." };
  }

  const result = await bulkDeletePhotos(parsed.data.photoIds);
  revalidatePath(ADMIN_PATHS.photos);
  revalidatePath(ADMIN_PATHS.events);
  return {
    ok: true,
    result,
    message:
      result.blocked.length > 0
        ? `${plural(result.affected, "foto eliminada", "fotos eliminadas")}. ${plural(result.blocked.length, "foto está", "fotos están")} en un pedido y no se ${result.blocked.length === 1 ? "borró" : "borraron"}.`
        : `${plural(result.affected, "foto eliminada", "fotos eliminadas")}.`,
  };
}

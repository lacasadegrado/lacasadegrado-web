"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { usdToCents } from "@/common/lib/utils/money.util";

import {
  bulkTagSchema,
  deletePhotoSchema,
  removeTagSchema,
  tagPhotoSchema,
  updatePhotoPriceSchema,
} from "../schemas/admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import {
  addTag,
  bulkTagByFilename,
  deletePhoto,
  removeTag,
  updatePhotoPrice,
} from "../services/photo.service";
import type { ActionState, BulkTagState } from "../types/admin.types";
import { parseTagCsv } from "../utils/tag-csv.util";

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
    priceUsd: String(formData.get("priceUsd") ?? "").replace(",", "."),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Escribe un precio válido.",
    };
  }

  const updated = await updatePhotoPrice(parsed.data.photoId, usdToCents(parsed.data.priceUsd));
  if (!updated) return { status: "error", message: "No encontramos la foto." };

  revalidatePath(ADMIN_PATHS.photos);
  return { status: "success", message: "Precio guardado." };
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

export async function bulkTagAction(
  _previous: BulkTagState,
  formData: FormData,
): Promise<BulkTagState> {
  await requireAdmin();

  const parsed = bulkTagSchema.safeParse({
    eventId: formData.get("eventId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el texto pegado.",
    };
  }

  const { rows, invalid } = parseTagCsv(parsed.data.csv);
  if (rows.length === 0 && invalid.length === 0) {
    return { status: "error", message: "No encontramos líneas con archivo,correo." };
  }

  const result = await bulkTagByFilename(parsed.data.eventId, rows, invalid);
  revalidatePath(ADMIN_PATHS.photos);
  return { status: "success", result };
}

"use server";

import { revalidatePath } from "next/cache";

import { eurToCents } from "@/common/lib/utils/money.util";

import { ADMIN_PATHS } from "../constants/admin.constants";
import {
  createPackageSchema,
  packageIdSchema,
  setPackageActiveSchema,
  updatePackageSchema,
} from "../schemas/form-admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import {
  createPackage,
  deletePackage,
  setPackageActive,
  updatePackage,
} from "../services/package.service";
import type { ActionState } from "../types/admin.types";

export type PackageActionOutcome = { ok: boolean; message: string };

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Packages show up in the list and in every builder of the event. */
function revalidateForms() {
  revalidatePath(ADMIN_PATHS.eventForms, "layout");
}

function packageFields(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    priceEur: String(formData.get("priceEur") ?? "").replace(",", "."),
  };
}

export async function createPackageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = createPackageSchema.safeParse({
    eventId: formData.get("eventId"),
    ...packageFields(formData),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { priceEur, ...input } = parsed.data;
  await createPackage({ ...input, priceCents: eurToCents(priceEur) });
  revalidateForms();
  return { status: "success", message: `Paquete "${input.name}" creado.` };
}

export async function updatePackageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = updatePackageSchema.safeParse({
    packageId: formData.get("packageId"),
    ...packageFields(formData),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { packageId, priceEur, ...input } = parsed.data;
  const updated = await updatePackage(packageId, { ...input, priceCents: eurToCents(priceEur) });
  if (!updated) return { status: "error", message: "No encontramos el paquete." };

  revalidateForms();
  return { status: "success", message: "Paquete actualizado." };
}

export async function setPackageActiveAction(input: {
  packageId: string;
  isActive: boolean;
}): Promise<PackageActionOutcome> {
  await requireAdmin();

  const parsed = setPackageActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Paquete no válido." };

  const updated = await setPackageActive(parsed.data.packageId, parsed.data.isActive);
  if (!updated) return { ok: false, message: "No encontramos el paquete." };

  revalidateForms();
  return {
    ok: true,
    message: parsed.data.isActive ? "Paquete activado." : "Paquete desactivado.",
  };
}

export async function deletePackageAction(input: {
  packageId: string;
}): Promise<PackageActionOutcome> {
  await requireAdmin();

  const parsed = packageIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Paquete no válido." };

  const result = await deletePackage(parsed.data.packageId);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "has_submissions"
          ? "Alguien ya eligió este paquete. Desactívalo en vez de borrarlo."
          : "No encontramos el paquete.",
    };
  }

  revalidateForms();
  return { ok: true, message: "Paquete eliminado." };
}

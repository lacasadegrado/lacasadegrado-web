"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_PATHS } from "../constants/admin.constants";
import { importPeopleSchema } from "../schemas/people-import.schema";
import { requireAdmin } from "../services/admin-access.service";
import { importPeopleToPackage, type ImportPersonResult } from "../services/people-import.service";

export type ImportPeopleActionResult = { ok: true; results: ImportPersonResult[] } | { ok: false; message: string };

/** One batch of "Importar personas"; the dialog sends the next one when this returns. */
export async function importPeopleAction(input: unknown): Promise<ImportPeopleActionResult> {
  const admin = await requireAdmin();
  const parsed = importPeopleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hay datos no válidos en este grupo. Revisa los correos." };

  const outcome = await importPeopleToPackage(parsed.data, admin.id);
  if (!outcome.ok) return { ok: false, message: "Ese paquete ya no existe. Recarga la página." };

  revalidatePath(ADMIN_PATHS.users);
  revalidatePath(ADMIN_PATHS.payments, "layout");
  return { ok: true, results: outcome.results };
}

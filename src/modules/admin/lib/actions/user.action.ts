"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ADMIN_PATHS } from "../constants/admin.constants"
import { createUserSchema, updateUserPermissionsSchema } from "../schemas/admin.schema"
import { requireAdmin } from "../services/admin-access.service"
import { createUserWithAccess, updateUserPermissions } from "../services/user.service"
import type { ActionState } from "../types/admin.types"

export async function updateUserPermissionsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin()

  const parsed = updateUserPermissionsSchema.safeParse({
    profileId: formData.get("profileId"),
    roleLabel: formData.get("roleLabel") ?? "",
    freeView: formData.get("freeView"),
    freeDownload: formData.get("freeDownload"),
    isAdmin: formData.get("isAdmin"),
  })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa los campos.",
    }
  }

  const result = await updateUserPermissions(admin.id, parsed.data)
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "self_admin"
          ? "No puedes quitarte el acceso de administrador a ti mismo."
          : "No encontramos a esta persona.",
    }
  }

  revalidatePath(ADMIN_PATHS.users)
  revalidatePath(ADMIN_PATHS.user(parsed.data.profileId))
  revalidatePath("/dashboard")
  return { status: "success", message: "Permisos guardados." }
}

/** Creates the account with its access flags and opens the new person's page. */
export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    roleLabel: formData.get("roleLabel") ?? "",
    freeView: formData.get("freeView"),
    freeDownload: formData.get("freeDownload"),
  })
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa los campos.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "" },
    }
  }

  const result = await createUserWithAccess(parsed.data)
  if (!result.ok) {
    if (result.reason === "exists") {
      return {
        status: "error",
        message: "Esa persona ya existe. Cambia sus permisos desde su ficha.",
        fieldErrors: { existingProfileId: result.profileId },
      }
    }
    console.error("[admin] create user failed", { message: result.message })
    return { status: "error", message: "No pudimos crear la cuenta. Intenta de nuevo." }
  }

  revalidatePath(ADMIN_PATHS.users)
  redirect(ADMIN_PATHS.user(result.profileId))
}

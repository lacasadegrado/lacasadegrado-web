"use server"

import { revalidatePath } from "next/cache"

import { ADMIN_PATHS } from "../constants/admin.constants"
import { updateUserPermissionsSchema } from "../schemas/admin.schema"
import { requireAdmin } from "../services/admin-access.service"
import { updateUserPermissions } from "../services/user.service"
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

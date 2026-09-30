"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FORM_STATUS_LABELS } from "@/modules/forms/lib/constants/forms.constants";

import { ADMIN_PATHS } from "../constants/admin.constants";
import {
  createFormSchema,
  formIdSchema,
  saveFormSchema,
  setFormStatusSchema,
  type SaveFormInput,
} from "../schemas/form-admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import { createForm, deleteForm, saveForm, setFormStatus } from "../services/form.service";
import type { ActionState } from "../types/admin.types";
import type { SaveFormResult } from "../types/form-admin.types";

export type FormActionOutcome = { ok: boolean; message: string };

function revalidateForms() {
  revalidatePath(ADMIN_PATHS.eventForms, "layout");
}

/** Creates a draft with the default fields and opens the builder. */
export async function createFormAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = createFormSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el título.",
      fieldErrors: { title: parsed.error.issues[0]?.message ?? "Revisa el título." },
    };
  }

  const { id } = await createForm({ ...parsed.data, createdBy: admin.id });
  revalidateForms();
  redirect(ADMIN_PATHS.formBuilder(id));
}

export async function saveFormAction(input: SaveFormInput): Promise<SaveFormResult> {
  await requireAdmin();

  const parsed = saveFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Hay campos por corregir antes de guardar.",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
        message: issue.message,
      })),
    };
  }

  const { formId, ...data } = parsed.data;
  const saved = await saveForm(formId, data);
  if (!saved) return { ok: false, message: "No encontramos el formulario." };

  revalidateForms();
  return { ok: true, message: "Cambios guardados.", version: saved.version };
}

export async function setFormStatusAction(input: {
  formId: string;
  status: string;
}): Promise<FormActionOutcome> {
  await requireAdmin();

  const parsed = setFormStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Estado no válido." };

  const result = await setFormStatus(parsed.data.formId, parsed.data.status);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "no_packages"
          ? "Para abrir el formulario, el evento necesita al menos un paquete activo."
          : "No encontramos el formulario.",
    };
  }

  revalidateForms();
  return { ok: true, message: `Formulario ${FORM_STATUS_LABELS[parsed.data.status].toLowerCase()}.` };
}

export async function deleteFormAction(input: { formId: string }): Promise<FormActionOutcome> {
  await requireAdmin();

  const parsed = formIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Formulario no válido." };

  const result = await deleteForm(parsed.data.formId);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "has_submissions"
          ? "Este formulario ya tiene respuestas. Ciérralo en vez de borrarlo."
          : "No encontramos el formulario.",
    };
  }

  revalidateForms();
  return { ok: true, message: "Formulario eliminado." };
}

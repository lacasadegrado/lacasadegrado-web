"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_PATHS } from "../constants/admin.constants";
import {
  createEventSchema,
  deleteEventSchema,
  setEventActiveSchema,
  updateEventSchema,
} from "../schemas/admin.schema";
import { requireAdmin } from "../services/admin-access.service";
import {
  createEvent,
  deleteEvent,
  isSlugTaken,
  setEventActive,
  updateEvent,
} from "../services/event.service";
import type { ActionState } from "../types/admin.types";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function createEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = createEventSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution"),
    eventDate: formData.get("eventDate"),
    slug: formData.get("slug"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  if (await isSlugTaken(parsed.data.slug)) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: { slug: "Ya existe un evento con este identificador." },
    };
  }

  await createEvent(parsed.data);
  revalidatePath(ADMIN_PATHS.events);
  revalidatePath(ADMIN_PATHS.photos);
  return { status: "success", message: `Evento "${parsed.data.name}" creado.` };
}

export async function updateEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    institution: formData.get("institution"),
    eventDate: formData.get("eventDate"),
    slug: formData.get("slug"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  if (await isSlugTaken(parsed.data.slug, parsed.data.eventId)) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: { slug: "Ya existe otro evento con este identificador." },
    };
  }

  const { eventId, ...input } = parsed.data;
  await updateEvent(eventId, input);
  revalidatePath(ADMIN_PATHS.events);
  revalidatePath(ADMIN_PATHS.photos);
  revalidatePath("/");
  return { status: "success", message: "Evento actualizado." };
}

export async function deleteEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return { status: "error", message: "Evento no válido." };

  const result = await deleteEvent(parsed.data.eventId);
  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "has_photos"
          ? "Este evento tiene fotos. Bórralas primero o desactiva el evento."
          : "No encontramos el evento.",
    };
  }

  revalidatePath(ADMIN_PATHS.events);
  revalidatePath(ADMIN_PATHS.photos);
  revalidatePath("/");
  return { status: "success", message: "Evento eliminado." };
}

export async function setEventActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = setEventActiveSchema.safeParse({
    eventId: formData.get("eventId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return;

  await setEventActive(parsed.data.eventId, parsed.data.isActive);
  revalidatePath(ADMIN_PATHS.events);
}

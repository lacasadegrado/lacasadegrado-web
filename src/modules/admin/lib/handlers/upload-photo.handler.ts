import "server-only";

import { NextResponse } from "next/server";

import { uploadFileSchema, uploadPhotoFieldsSchema } from "../schemas/admin.schema";
import { getAdminUser } from "../services/admin-access.service";
import { getEventById } from "../services/event.service";
import { ingestPhoto } from "../services/photo-ingest.service";
import type { UploadResponse } from "../types/admin.types";

function reply(body: UploadResponse, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * One file per request, multipart. The browser uploader calls this in a
 * small parallel queue so each file reports its own success or failure.
 * Admin is verified here independently of the proxy.
 */
export async function uploadPhotoHandler(request: Request): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return reply({ ok: false, error: "No autorizado." }, 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return reply({ ok: false, error: "La solicitud no es válida." }, 400);
  }

  const fields = uploadPhotoFieldsSchema.safeParse({
    eventId: formData.get("eventId"),
    priceCents: formData.get("priceCents"),
    printPriceCents: formData.get("printPriceCents"),
  });
  if (!fields.success) {
    return reply({ ok: false, error: "Elige un evento y precios válidos." }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return reply({ ok: false, error: "No llegó ningún archivo." }, 400);
  }

  const checked = uploadFileSchema.safeParse({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (!checked.success) {
    return reply(
      { ok: false, error: checked.error.issues[0]?.message ?? "Archivo no válido." },
      400,
    );
  }

  const event = await getEventById(fields.data.eventId);
  if (!event) return reply({ ok: false, error: "El evento no existe." }, 404);

  try {
    const { id } = await ingestPhoto({
      eventId: event.id,
      priceCents: fields.data.priceCents,
      printPriceCents: fields.data.printPriceCents,
      filename: checked.data.name,
      contentType: checked.data.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    return reply({ ok: true, id, filename: checked.data.name });
  } catch (error) {
    console.error("[admin] photo ingest failed", {
      filename: checked.data.name,
      message: error instanceof Error ? error.message : String(error),
    });
    return reply(
      { ok: false, error: "No pudimos procesar esta foto. Intenta de nuevo." },
      500,
    );
  }
}

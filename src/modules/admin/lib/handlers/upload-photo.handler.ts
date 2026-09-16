import "server-only";

import { NextResponse } from "next/server";

import { completeUploadSchema, prepareUploadSchema } from "../schemas/admin.schema";
import { getAdminUser } from "../services/admin-access.service";
import { getEventById } from "../services/event.service";
import { completeUpload, prepareUpload } from "../services/photo-ingest.service";
import type { PrepareUploadResponse, UploadResponse } from "../types/admin.types";

function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Step 1 of a photo upload. The browser sends the file's metadata and gets
 * back a presigned PUT URL; the bytes then go straight to R2. Admin is
 * verified here independently of the proxy.
 */
export async function prepareUploadHandler(request: Request): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return json<PrepareUploadResponse>({ ok: false, error: "No autorizado." }, 403);

  const parsed = prepareUploadSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json<PrepareUploadResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Archivo no válido." },
      400,
    );
  }

  const event = await getEventById(parsed.data.eventId);
  if (!event) return json<PrepareUploadResponse>({ ok: false, error: "El evento no existe." }, 404);

  const { photoId, uploadUrl } = await prepareUpload({
    eventId: event.id,
    contentType: parsed.data.type,
  });
  return json<PrepareUploadResponse>({ ok: true, photoId, uploadUrl });
}

const COMPLETE_ERRORS = {
  missing: "El archivo no llegó al almacenamiento. Intenta de nuevo.",
  too_large: "El archivo pesa más de lo permitido.",
  wrong_type: "El archivo no es una imagen JPG, PNG o WebP.",
  duplicate: "Esta foto ya fue procesada.",
} as const;

/** Step 2: the PUT finished; verify the object, derive previews, insert the row. */
export async function completeUploadHandler(request: Request): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return json<UploadResponse>({ ok: false, error: "No autorizado." }, 403);

  const parsed = completeUploadSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json<UploadResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      400,
    );
  }

  const event = await getEventById(parsed.data.eventId);
  if (!event) return json<UploadResponse>({ ok: false, error: "El evento no existe." }, 404);

  try {
    const result = await completeUpload({
      photoId: parsed.data.photoId,
      eventId: event.id,
      priceCents: parsed.data.priceCents,
      printPriceCents: parsed.data.printPriceCents,
      filename: parsed.data.name,
      contentType: parsed.data.type,
    });
    if (!result.ok) return json<UploadResponse>({ ok: false, error: COMPLETE_ERRORS[result.reason] }, 400);
    return json<UploadResponse>({ ok: true, id: result.id, filename: parsed.data.name });
  } catch (error) {
    console.error("[admin] photo processing failed", {
      photoId: parsed.data.photoId,
      message: error instanceof Error ? error.message : String(error),
    });
    return json<UploadResponse>(
      { ok: false, error: "No pudimos procesar esta foto. Intenta de nuevo." },
      500,
    );
  }
}

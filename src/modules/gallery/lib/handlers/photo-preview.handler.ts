import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getPresignedGetUrl } from "@/common/lib/storage/storage.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { PREVIEW_URL_TTL_SECONDS } from "../constants/gallery.constants";
import { getPreviewKeyForViewer } from "../services/photo-access.service";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/photos/[id]/preview (security rule 4). Session, then a
 * photo_tags match for the session email, then a short-lived presigned
 * redirect. Unknown and unauthorized both answer 404 so the id space
 * cannot be probed.
 */
export async function photoPreviewHandler(photoId: string): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401, headers: NO_STORE });

  if (!z.uuid().safeParse(photoId).success) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const previewKey = await getPreviewKeyForViewer(user, photoId);
  if (!previewKey) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const url = await getPresignedGetUrl(previewKey, {
    expiresInSeconds: PREVIEW_URL_TTL_SECONDS,
  });
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}

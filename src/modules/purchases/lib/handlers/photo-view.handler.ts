import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getPresignedGetUrl } from "@/common/lib/storage/storage.service";
import { isAdminUser } from "@/modules/admin/lib/services/admin-access.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { VIEW_URL_TTL_SECONDS } from "../constants/purchases.constants";
import { getEntitledPhotoKeys, getPhotoKeysAsAdmin } from "../services/download.service";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/photos/[id]/view. The clean derivative, for people entitled
 * to the photo and for admins. Falls back to the original, inline, for
 * photos ingested before the derivative existed. Everyone else: 404.
 */
export async function photoViewHandler(photoId: string): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401, headers: NO_STORE });

  if (!z.uuid().safeParse(photoId).success) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  let keys = await getEntitledPhotoKeys(user, photoId);
  if (!keys && (await isAdminUser(user.id))) {
    const adminKeys = await getPhotoKeysAsAdmin(photoId);
    keys = adminKeys ? { ...adminKeys, photoId, originalFilename: "", eventSlug: "" } : null;
  }
  if (!keys) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const url = await getPresignedGetUrl(keys.cleanKey ?? keys.originalKey, {
    expiresInSeconds: VIEW_URL_TTL_SECONDS,
    contentDisposition: "inline",
  });
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}

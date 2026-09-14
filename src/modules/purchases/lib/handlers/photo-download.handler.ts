import "server-only"

import { NextResponse } from "next/server"
import { z } from "zod"

import { getPresignedGetUrl } from "@/common/lib/storage/storage.service"
import { getViewerAccess } from "@/modules/auth/lib/services/access.service"
import { getSessionUser } from "@/modules/auth/lib/services/session.service"
import { getClientIp } from "@/modules/auth/lib/utils/auth.util"

import { DOWNLOAD_URL_TTL_SECONDS } from "../constants/purchases.constants"
import {
  getEntitledPhotoKeys,
  getTaggedPhotoKeys,
  recordDownloads,
} from "../services/download.service"
import { attachmentDisposition } from "../utils/filename.util"

const NO_STORE = { "Cache-Control": "private, no-store" }

/**
 * GET /api/photos/[id]/download (security rule 5). Session, then an
 * entitlements row for (profile, photo) or free-download access to a photo
 * the person is tagged in, then a download_logs row, then a 60-second
 * presigned redirect that forces `attachment`.
 */
export async function photoDownloadHandler(request: Request, photoId: string): Promise<Response> {
  const user = await getSessionUser()
  if (!user) return new NextResponse(null, { status: 401, headers: NO_STORE })

  if (!z.uuid().safeParse(photoId).success) {
    return new NextResponse(null, { status: 404, headers: NO_STORE })
  }

  let photo = await getEntitledPhotoKeys(user, photoId)
  if (!photo) {
    const access = await getViewerAccess(user)
    if (access.freeDownload) photo = await getTaggedPhotoKeys(user, photoId)
  }
  if (!photo) return new NextResponse(null, { status: 404, headers: NO_STORE })

  await recordDownloads(user, [photo.photoId], {
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  })

  const url = await getPresignedGetUrl(photo.originalKey, {
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
    contentDisposition: attachmentDisposition(photo.originalFilename),
  })
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE })
}

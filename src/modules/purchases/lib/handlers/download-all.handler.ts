import "server-only";

import { Readable } from "node:stream";

import { ZipArchive } from "archiver";
import { NextResponse } from "next/server";

import { getObjectStream } from "@/common/lib/storage/storage.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";
import { getClientIp } from "@/modules/auth/lib/utils/auth.util";

import { ZIP_FILENAME } from "../constants/purchases.constants";
import { listEntitledPhotoKeys, recordDownloads } from "../services/download.service";
import { attachmentDisposition, dedupeNames, zipSafeName } from "../utils/filename.util";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/purchases/download-all. Streams a zip of every original the
 * viewer is entitled to. Originals are already compressed images, so the
 * archive stores them (no deflate) and one R2 object is in flight at a
 * time, which keeps memory flat regardless of how many photos there are.
 */
export async function downloadAllHandler(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401, headers: NO_STORE });

  const items = await listEntitledPhotoKeys(user);
  if (items.length === 0) return new NextResponse(null, { status: 404, headers: NO_STORE });

  await recordDownloads(
    user,
    items.map((item) => item.photoId),
    { ip: getClientIp(request.headers), userAgent: request.headers.get("user-agent") },
  );

  const names = dedupeNames(items.map((item) => zipSafeName(item.originalFilename)));
  const archive = new ZipArchive({ store: true });

  const pump = async () => {
    for (const [index, item] of items.entries()) {
      const body = await getObjectStream(item.originalKey);
      const entryDone = new Promise<void>((resolve) => archive.once("entry", () => resolve()));
      archive.append(body, { name: `${item.eventSlug}/${names[index]}` });
      await entryDone;
    }
    await archive.finalize();
  };
  pump().catch((error: unknown) => {
    console.error("[purchases] zip stream failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    archive.destroy(error instanceof Error ? error : new Error(String(error)));
  });

  return new Response(Readable.toWeb(archive) as ReadableStream, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/zip",
      "Content-Disposition": attachmentDisposition(ZIP_FILENAME),
    },
  });
}

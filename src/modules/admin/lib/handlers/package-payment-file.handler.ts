import "server-only";

import { NextResponse } from "next/server";

import { getPresignedGetUrl } from "@/common/lib/storage/storage.service";
import { PREVIEW_URL_TTL_SECONDS } from "@/modules/gallery/lib/constants/gallery.constants";

import { packagePaymentFileParamsSchema } from "../schemas/package-payment.schema";
import { getAdminUser } from "../services/admin-access.service";
import { getPackagePaymentFileKey } from "../services/package-payment.service";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/admin/package-payments/[id]/files/[fieldId]/[index]. Admin
 * only; redirects to a short-lived presigned URL. This stable path is
 * what the Excel links to, since presigned URLs expire.
 */
export async function packagePaymentFileHandler(params: {
  id: string;
  fieldId: string;
  index: string;
}): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const parsed = packagePaymentFileParamsSchema.safeParse(params);
  if (!parsed.success) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const key = await getPackagePaymentFileKey(parsed.data.id, parsed.data.fieldId, parsed.data.index);
  if (!key) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const url = await getPresignedGetUrl(key, { expiresInSeconds: PREVIEW_URL_TTL_SECONDS });
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}

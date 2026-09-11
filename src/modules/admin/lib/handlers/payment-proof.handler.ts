import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getPresignedGetUrl } from "@/common/lib/storage/storage.service";
import { PREVIEW_URL_TTL_SECONDS } from "@/modules/gallery/lib/constants/gallery.constants";

import { getAdminUser } from "../services/admin-access.service";
import { getProofKey } from "../services/payment-review.service";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** GET /api/admin/payments/[id]/proof. Admin only; short-lived presigned redirect. */
export async function paymentProofHandler(paymentId: string): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse(null, { status: 404, headers: NO_STORE });

  if (!z.uuid().safeParse(paymentId).success) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const key = await getProofKey(paymentId);
  if (!key) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const url = await getPresignedGetUrl(key, { expiresInSeconds: PREVIEW_URL_TTL_SECONDS });
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}

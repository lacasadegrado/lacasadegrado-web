import "server-only";

import sharp from "sharp";

import { buildWatermarkSvg } from "@/common/lib/utils/logo-svg.util";

import { CLEAN_DERIVATIVE, PREVIEW_DERIVATIVE } from "../constants/admin.constants";

export type PreviewDerivative = {
  /** Watermarked WebP shown before purchase (no blur since 2026-10-21). */
  preview: Buffer;
  /** Same size, untouched, shown after purchase. */
  clean: Buffer;
  /** Dimensions of the original, after EXIF orientation is applied. */
  original: { width: number; height: number };
  previewSize: { width: number; height: number };
};

/**
 * Security rule 7. Runs once at ingest, never on request:
 * longest edge to 1400px, optional Gaussian blur (PREVIEW_DERIVATIVE.blurSigma,
 * 0 = none), dense tiled diagonal watermark, WebP quality 70. The original bytes are never touched.
 * The clean derivative is the same resize without blur or watermark.
 */
export async function generatePreview(
  original: Buffer,
  /** Overrides PREVIEW_DERIVATIVE.blurSigma; only the regenerate script uses it, for tests. */
  options: { blurSigma?: number } = {},
): Promise<PreviewDerivative> {
  const source = sharp(original, { failOn: "none" }).rotate();
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("La imagen no tiene dimensiones legibles.");
  }

  // metadata() reports pre-rotation dimensions; orientations 5-8 are
  // rotated 90 degrees, so swap.
  const swapped = (metadata.orientation ?? 1) >= 5;
  const originalSize = swapped
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };

  const { data: resized, info } = await source
    .resize({
      width: PREVIEW_DERIVATIVE.maxEdge,
      height: PREVIEW_DERIVATIVE.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });

  const watermark = Buffer.from(
    buildWatermarkSvg({ width: info.width, height: info.height }),
  );

  const blurSigma = options.blurSigma ?? PREVIEW_DERIVATIVE.blurSigma;
  const base = sharp(resized);
  // sharp rejects sigma below 0.3; 0 means "watermark only".
  const watermarked = blurSigma >= 0.3 ? base.blur(blurSigma) : base;

  const [preview, clean] = await Promise.all([
    watermarked
      .composite([{ input: watermark, blend: "over" }])
      .webp({ quality: PREVIEW_DERIVATIVE.webpQuality })
      .toBuffer(),
    sharp(resized).webp({ quality: CLEAN_DERIVATIVE.webpQuality }).toBuffer(),
  ]);

  return {
    preview,
    clean,
    original: originalSize,
    previewSize: { width: info.width, height: info.height },
  };
}

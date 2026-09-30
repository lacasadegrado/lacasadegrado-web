/**
 * Rebuilds the blurred, watermarked preview of every photo from its
 * original, with the current PREVIEW_DERIVATIVE settings (e.g. after
 * changing the blur). Overwrites each `preview_key` object in place, so
 * no row changes; originals and clean derivatives are not touched.
 *
 *   npm run photos:regenerate-previews                  # dry run: counts only
 *   npm run photos:regenerate-previews -- --yes         # regenerates all
 *   npm run photos:regenerate-previews -- --yes --limit 3   # the 3 oldest, to check first
 *   npm run photos:regenerate-previews -- --yes --photo <id> --sigma 0.3
 *       one photo with another blur (0.3 is sharp's minimum), to test; run
 *       it again without --sigma to put that photo back on the normal blur
 *
 * Uses the same generatePreview() as ingest, so the result is identical
 * to a fresh upload. Safe to re-run. Reads .env.local.
 */
import { asc, eq } from "drizzle-orm";

import { db } from "../src/common/lib/db";
import { photos } from "../src/common/lib/db/schema";
import { getObjectBuffer, putObject } from "../src/common/lib/storage/storage.service";
import { PREVIEW_DERIVATIVE } from "../src/modules/admin/lib/constants/admin.constants";
import { generatePreview } from "../src/modules/admin/lib/services/preview.service";

const CONCURRENCY = 3;

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--yes");
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  const photoIndex = args.indexOf("--photo");
  const photoId = photoIndex >= 0 ? args[photoIndex + 1] : undefined;
  if (photoIndex >= 0 && !/^[0-9a-f-]{36}$/i.test(photoId ?? "")) throw new Error("--photo needs a photo id.");
  const sigmaIndex = args.indexOf("--sigma");
  const sigma = sigmaIndex >= 0 ? Number(args[sigmaIndex + 1]) : PREVIEW_DERIVATIVE.blurSigma;
  if (!Number.isFinite(sigma) || sigma < 0.3 || sigma > 100) throw new Error("--sigma must be between 0.3 and 100.");
  // A test blur must never reach every customer's previews by accident.
  if (sigmaIndex >= 0 && !photoId) throw new Error("--sigma only works together with --photo <id>.");

  const all = await db
    .select({ id: photos.id, originalKey: photos.originalKey, previewKey: photos.previewKey, name: photos.originalFilename })
    .from(photos)
    .where(photoId ? eq(photos.id, photoId) : undefined)
    .orderBy(asc(photos.createdAt));
  const targets = limit ? all.slice(0, limit) : all;

  console.log(`Photos: ${all.length}. To regenerate: ${targets.length}. Blur sigma: ${sigma}${sigma === PREVIEW_DERIVATIVE.blurSigma ? "" : " (override)"}.`);
  if (!confirmed) {
    console.log("Dry run. Nothing was changed. Re-run with --yes.");
    return;
  }

  const failed: string[] = [];
  let done = 0;
  const queue = [...targets];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const photo = queue.shift();
        if (!photo) continue;
        try {
          const { preview } = await generatePreview(await getObjectBuffer(photo.originalKey), { blurSigma: sigma });
          await putObject(photo.previewKey, preview, "image/webp");
          done += 1;
          if (done % 10 === 0 || done === targets.length) console.log(`  ${done}/${targets.length}`);
        } catch (error) {
          failed.push(photo.name);
          console.error(`  failed: ${photo.name} (${photo.id})`, error instanceof Error ? error.message : error);
        }
      }
    }),
  );

  console.log(`\nRegenerated ${done} of ${targets.length}.`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}. Re-run to retry; it is safe.`);
    process.exitCode = 1;
  }
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);

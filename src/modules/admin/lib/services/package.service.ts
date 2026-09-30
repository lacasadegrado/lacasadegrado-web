import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { formSubmissions, photoPackages } from "@/common/lib/db/schema";

import type { AdminPackage } from "../types/form-admin.types";

/** Every package of the event, active first, then by price. */
export async function listPackagesForEvent(eventId: string): Promise<AdminPackage[]> {
  return db
    .select({
      id: photoPackages.id,
      eventId: photoPackages.eventId,
      name: photoPackages.name,
      description: photoPackages.description,
      priceCents: photoPackages.priceCents,
      isActive: photoPackages.isActive,
      submissionCount: count(formSubmissions.id),
    })
    .from(photoPackages)
    .leftJoin(formSubmissions, eq(formSubmissions.packageId, photoPackages.id))
    .where(eq(photoPackages.eventId, eventId))
    .groupBy(photoPackages.id)
    .orderBy(asc(photoPackages.sortOrder), asc(photoPackages.priceCents), asc(photoPackages.createdAt));
}

export async function createPackage(input: {
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number;
}): Promise<void> {
  await db.insert(photoPackages).values(input);
}

/**
 * Renaming or repricing only affects future submissions: each one keeps
 * the name and price it was sent with.
 */
export async function updatePackage(
  packageId: string,
  input: { name: string; description: string | null; priceCents: number },
): Promise<{ eventId: string } | null> {
  const [row] = await db
    .update(photoPackages)
    .set(input)
    .where(eq(photoPackages.id, packageId))
    .returning({ eventId: photoPackages.eventId });
  return row ?? null;
}

export async function setPackageActive(
  packageId: string,
  isActive: boolean,
): Promise<{ eventId: string } | null> {
  const [row] = await db
    .update(photoPackages)
    .set({ isActive })
    .where(eq(photoPackages.id, packageId))
    .returning({ eventId: photoPackages.eventId });
  return row ?? null;
}

export type DeletePackageResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: "not_found" | "has_submissions" };

/** Only for mistakes: a package someone already chose is deactivated instead. */
export async function deletePackage(packageId: string): Promise<DeletePackageResult> {
  const [row] = await db
    .select({ eventId: photoPackages.eventId, submissionCount: count(formSubmissions.id) })
    .from(photoPackages)
    .leftJoin(formSubmissions, eq(formSubmissions.packageId, photoPackages.id))
    .where(eq(photoPackages.id, packageId))
    .groupBy(photoPackages.id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.submissionCount > 0) return { ok: false, reason: "has_submissions" };

  await db.delete(photoPackages).where(eq(photoPackages.id, packageId));
  return { ok: true, eventId: row.eventId };
}

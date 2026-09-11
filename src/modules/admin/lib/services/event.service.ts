import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, photos } from "@/common/lib/db/schema";

import type { CreateEventInput } from "../schemas/admin.schema";
import type { AdminEvent } from "../types/admin.types";

export async function listEvents(): Promise<AdminEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      institution: events.institution,
      eventDate: events.eventDate,
      slug: events.slug,
      isActive: events.isActive,
      createdAt: events.createdAt,
      photoCount: count(photos.id),
    })
    .from(events)
    .leftJoin(photos, eq(photos.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.eventDate), desc(events.createdAt));
  return rows;
}

export async function getEventById(id: string) {
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return row ?? null;
}

export async function isSlugTaken(slug: string, excludeEventId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  return Boolean(row) && row.id !== excludeEventId;
}

export async function updateEvent(id: string, input: CreateEventInput): Promise<void> {
  await db
    .update(events)
    .set({
      name: input.name,
      institution: input.institution,
      eventDate: input.eventDate,
      slug: input.slug,
      isActive: input.isActive,
    })
    .where(eq(events.id, id));
}

export type DeleteEventResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "has_photos" };

/**
 * Deleting is only for mistakes: an event with photos cannot be removed,
 * because orders and entitlements hang off those photos. Deactivate it
 * instead, or delete its photos first.
 */
export async function deleteEvent(id: string): Promise<DeleteEventResult> {
  const [row] = await db
    .select({ id: events.id, photoCount: count(photos.id) })
    .from(events)
    .leftJoin(photos, eq(photos.eventId, events.id))
    .where(eq(events.id, id))
    .groupBy(events.id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.photoCount > 0) return { ok: false, reason: "has_photos" };

  await db.delete(events).where(eq(events.id, id));
  return { ok: true };
}

export async function createEvent(input: CreateEventInput): Promise<{ id: string }> {
  const [row] = await db
    .insert(events)
    .values({
      name: input.name,
      institution: input.institution,
      eventDate: input.eventDate,
      slug: input.slug,
      isActive: input.isActive,
    })
    .returning({ id: events.id });
  return row;
}

export async function setEventActive(id: string, isActive: boolean): Promise<void> {
  await db.update(events).set({ isActive }).where(eq(events.id, id));
}

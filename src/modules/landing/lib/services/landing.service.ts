import "server-only";

import { and, count, desc, eq, gt } from "drizzle-orm";

import { db } from "@/common/lib/db";
import { events, photos } from "@/common/lib/db/schema";

import type { PublishedEvent } from "../types/landing.types";

/**
 * Active events that already have photos, newest first. Public data by
 * design: a student can confirm their ceremony is up before logging in.
 * Nothing about who is in the photos leaves this query.
 */
export async function listPublishedEvents(limit = 8): Promise<PublishedEvent[]> {
  return db
    .select({
      id: events.id,
      name: events.name,
      institution: events.institution,
      eventDate: events.eventDate,
      photoCount: count(photos.id),
    })
    .from(events)
    .innerJoin(photos, eq(photos.eventId, events.id))
    .where(and(eq(events.isActive, true)))
    .groupBy(events.id)
    .having(gt(count(photos.id), 0))
    .orderBy(desc(events.eventDate), desc(events.createdAt))
    .limit(limit);
}

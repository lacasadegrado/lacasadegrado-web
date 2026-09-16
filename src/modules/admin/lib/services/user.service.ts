import "server-only"

import { and, asc, count, countDistinct, desc, eq, ilike, or, sql } from "drizzle-orm"

import { db } from "@/common/lib/db"
import {
  downloadLogs,
  entitlements,
  events,
  orderItems,
  orders,
  payments,
  photoTags,
  photos,
  profiles,
  supportMessages,
} from "@/common/lib/db/schema"

import type { UpdateUserPermissionsInput } from "../schemas/admin.schema"
import type { AdminUserDetail, AdminUserRow } from "../types/user.types"

/** Everyone who has logged in at least once, newest first, with activity counts. */
export async function listUsers(query?: string): Promise<AdminUserRow[]> {
  const term = query?.trim()
  const where = term
    ? or(
        ilike(profiles.email, `%${term}%`),
        ilike(profiles.fullName, `%${term}%`),
        ilike(profiles.roleLabel, `%${term}%`),
      )
    : undefined

  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      roleLabel: profiles.roleLabel,
      isAdmin: profiles.isAdmin,
      freeView: profiles.freeView,
      freeDownload: profiles.freeDownload,
      createdAt: profiles.createdAt,
      taggedPhotos: countDistinct(photoTags.id),
      orders: countDistinct(orders.id),
      messages: countDistinct(supportMessages.id),
    })
    .from(profiles)
    .leftJoin(photoTags, eq(photoTags.email, profiles.email))
    .leftJoin(orders, eq(orders.profileId, profiles.id))
    .leftJoin(supportMessages, eq(supportMessages.profileId, profiles.id))
    .where(where)
    .groupBy(profiles.id)
    .orderBy(desc(profiles.createdAt))
    .limit(200)

  return rows
}

export async function getUserDetail(profileId: string): Promise<AdminUserDetail | null> {
  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      phone: profiles.phone,
      roleLabel: profiles.roleLabel,
      isAdmin: profiles.isAdmin,
      freeView: profiles.freeView,
      freeDownload: profiles.freeDownload,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1)
  if (!profile) return null

  const [photoRows, orderRows, messageRows, downloadRow] = await Promise.all([
    db
      .select({
        id: photos.id,
        width: photos.width,
        height: photos.height,
        originalFilename: photos.originalFilename,
        priceCents: photos.priceCents,
        printPriceCents: photos.printPriceCents,
        eventName: events.name,
        owned: sql<boolean>`${entitlements.id} is not null`,
      })
      .from(photoTags)
      .innerJoin(photos, eq(photos.id, photoTags.photoId))
      .innerJoin(events, eq(events.id, photos.eventId))
      .leftJoin(
        entitlements,
        and(eq(entitlements.photoId, photos.id), eq(entitlements.profileId, profile.id)),
      )
      .where(eq(photoTags.email, profile.email))
      // Bought photos first, then by event and filename.
      .orderBy(
        desc(sql`${entitlements.id} is not null`),
        desc(events.eventDate),
        asc(photos.originalFilename),
      ),
    db
      .select({
        id: orders.id,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        itemCount: countDistinct(orderItems.id),
        printCount: sql<number>`count(distinct case when ${orderItems.format} = 'print' then ${orderItems.id} end)::int`,
        latestReference: sql<string | null>`(
          select ${payments.reference} from ${payments}
          where ${payments.orderId} = ${orders.id}
          order by ${payments.submittedAt} desc limit 1
        )`,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(orders.profileId, profile.id))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt)),
    db
      .select({
        id: supportMessages.id,
        channel: supportMessages.channel,
        status: supportMessages.status,
        message: supportMessages.message,
        createdAt: supportMessages.createdAt,
      })
      .from(supportMessages)
      .where(eq(supportMessages.profileId, profile.id))
      .orderBy(desc(supportMessages.createdAt))
      .limit(50),
    db
      .select({ total: count() })
      .from(downloadLogs)
      .where(eq(downloadLogs.profileId, profile.id)),
  ])

  return {
    profile,
    photos: photoRows,
    orders: orderRows,
    messages: messageRows,
    downloads: downloadRow[0]?.total ?? 0,
  }
}

export type UpdatePermissionsResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "self_admin" }

/**
 * Sets the special-access flags. An admin cannot remove their own admin
 * flag here, so the last admin can never lock everyone out by accident.
 */
export async function updateUserPermissions(
  actorId: string,
  input: UpdatePermissionsInput,
): Promise<UpdatePermissionsResult> {
  if (input.profileId === actorId && !input.isAdmin) {
    return { ok: false, reason: "self_admin" }
  }
  const updated = await db
    .update(profiles)
    .set({
      roleLabel: input.roleLabel,
      freeView: input.freeView,
      freeDownload: input.freeDownload,
      isAdmin: input.isAdmin,
    })
    .where(eq(profiles.id, input.profileId))
    .returning({ id: profiles.id })
  return updated.length > 0 ? { ok: true } : { ok: false, reason: "not_found" }
}

type UpdatePermissionsInput = UpdateUserPermissionsInput

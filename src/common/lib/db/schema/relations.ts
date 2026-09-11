import { relations } from "drizzle-orm";

import { downloadLogs } from "./download-logs.table";
import { entitlements } from "./entitlements.table";
import { events } from "./events.table";
import { exchangeRates } from "./exchange-rates.table";
import { orderItems, orders } from "./orders.table";
import { payments } from "./payments.table";
import { photoTags, photos } from "./photos.table";
import { profiles } from "./profiles.table";
import { supportMessages } from "./support-messages.table";

export const profilesRelations = relations(profiles, ({ many }) => ({
  orders: many(orders),
  entitlements: many(entitlements),
  supportMessages: many(supportMessages),
  downloadLogs: many(downloadLogs),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  event: one(events, { fields: [photos.eventId], references: [events.id] }),
  tags: many(photoTags),
  orderItems: many(orderItems),
  entitlements: many(entitlements),
}));

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
  photo: one(photos, { fields: [photoTags.photoId], references: [photos.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [orders.profileId],
    references: [profiles.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  entitlements: many(entitlements),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  photo: one(photos, { fields: [orderItems.photoId], references: [photos.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  verifier: one(profiles, {
    fields: [payments.verifiedBy],
    references: [profiles.id],
  }),
}));

export const entitlementsRelations = relations(entitlements, ({ one }) => ({
  profile: one(profiles, {
    fields: [entitlements.profileId],
    references: [profiles.id],
  }),
  photo: one(photos, {
    fields: [entitlements.photoId],
    references: [photos.id],
  }),
  order: one(orders, {
    fields: [entitlements.orderId],
    references: [orders.id],
  }),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  profile: one(profiles, {
    fields: [supportMessages.profileId],
    references: [profiles.id],
  }),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  createdBy: one(profiles, {
    fields: [exchangeRates.createdBy],
    references: [profiles.id],
  }),
}));

export const downloadLogsRelations = relations(downloadLogs, ({ one }) => ({
  profile: one(profiles, {
    fields: [downloadLogs.profileId],
    references: [profiles.id],
  }),
  photo: one(photos, {
    fields: [downloadLogs.photoId],
    references: [photos.id],
  }),
}));

import type { OrderStatus, PaymentMethod } from "@/common/lib/db/schema";

export type DashboardBucket = "day" | "week" | "month";

/** Money in EUR cents; `ves` in bolívar cents at each payment's own rate. */
export type Money = { eur: number; ves: number };

export type DashboardKpis = {
  revenue: Money;
  photoRevenue: Money;
  packageRevenue: Money;
  ordersPaid: number;
  /** Photo orders only; null when there were none. */
  averageOrderCents: number | null;
  photosSold: { digital: number; print: number };
  packagePaymentsConfirmed: number;
  packagesFullyPaid: number;
  newUsers: number;
};

/** Current state, not limited to the range: what needs someone now. */
export type DashboardPending = {
  orders: { count: number; cents: number; oldestAt: Date | null };
  packagePayments: { count: number; cents: number; oldestAt: Date | null };
  prints: { pending: number; late: number };
};

export type RevenuePoint = { bucket: string; label: string; photos: number; packages: number };

export type OrdersByStatus = { status: OrderStatus; count: number; cents: number }[];

export type MethodLine = { method: PaymentMethod; count: number; cents: number };

export type EventLine = {
  id: string;
  name: string;
  isActive: boolean;
  /** All time: how complete the event is. */
  photos: number;
  taggedPhotos: number;
  peopleTagged: number;
  buyers: number;
  /** In the range. */
  revenueCents: number;
  photosSold: number;
  printsSold: number;
  packagesConfirmedCents: number;
};

export type RejectionLine = { reason: string; count: number };

export type PersonLine = { email: string; name: string | null; value: number; profileId: string | null };

export type DashboardData = {
  range: { from: Date | null; to: Date; bucket: DashboardBucket };
  kpis: DashboardKpis;
  pending: DashboardPending;
  revenueSeries: RevenuePoint[];
  ordersByStatus: OrdersByStatus;
  methods: MethodLine[];
  events: EventLine[];
  rejections: RejectionLine[];
  /** Tagged in some photo and never bought: the people worth a reminder. Value = photos tagged. */
  toRemind: { total: number; people: PersonLine[] };
  /** Bought and never downloaded. Value = photos bought. */
  neverDownloaded: { total: number; people: PersonLine[] };
  /** Value = EUR cents spent on photos. */
  topBuyers: PersonLine[];
};

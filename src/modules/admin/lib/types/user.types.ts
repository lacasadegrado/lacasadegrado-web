import type { OrderStatus, PaymentMethod, SupportChannel, SupportStatus } from "@/common/lib/db/schema"

export type AdminUserRow = {
  id: string
  email: string
  fullName: string | null
  roleLabel: string | null
  isAdmin: boolean
  freeView: boolean
  freeDownload: boolean
  createdAt: Date
  taggedPhotos: number
  orders: number
  messages: number
}

export type AdminUserPhoto = {
  id: string
  width: number
  height: number
  originalFilename: string
  priceCents: number
  eventName: string
  /** The person holds an entitlement (bought, or granted by an approval). */
  owned: boolean
}

export type AdminUserOrder = {
  id: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  totalCents: number
  itemCount: number
  createdAt: Date
  paidAt: Date | null
  latestReference: string | null
}

export type AdminUserMessage = {
  id: string
  channel: SupportChannel
  status: SupportStatus
  message: string
  createdAt: Date
}

export type AdminUserDetail = {
  profile: Omit<AdminUserRow, "taggedPhotos" | "orders" | "messages"> & { phone: string | null }
  photos: AdminUserPhoto[]
  orders: AdminUserOrder[]
  messages: AdminUserMessage[]
  downloads: number
}

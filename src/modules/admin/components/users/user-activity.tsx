import Link from "next/link"

import { PhotoLightbox } from "@/common/components/photo-lightbox/photo-lightbox"
import { Badge } from "@/common/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table"
import { formatDateTime } from "@/common/lib/utils/date.util"
import { formatUsd } from "@/common/lib/utils/money.util"
import { PAYMENT_METHODS } from "@/modules/checkout/lib/constants/checkout.constants"
import { ORDER_STATUS_LABELS } from "@/modules/orders/lib/constants/orders.constants"
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants"

import { ADMIN_PATHS } from "../../lib/constants/admin.constants"
import type { AdminUserMessage, AdminUserOrder, AdminUserPhoto } from "../../lib/types/user.types"

export function UserPhotos({ photos }: { photos: AdminUserPhoto[] }) {
  if (photos.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No está etiquetada en ninguna foto. Etiquétala desde Fotos con su correo.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {photos.map((photo) => {
        const src = PURCHASES_PATHS.viewApi(photo.id)
        return (
          <li key={photo.id} className="overflow-hidden rounded-md border bg-card">
            <div
              className="relative bg-muted"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <PhotoLightbox src={src} alt={photo.originalFilename} width={photo.width} height={photo.height} />
            </div>
            <div className="space-y-1 p-2">
              <p className="truncate text-xs font-medium" title={photo.eventName}>
                {photo.eventName}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatUsd(photo.priceCents)}
                </span>
                {photo.owned ? <Badge variant="secondary">Comprada</Badge> : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function UserOrders({ orders }: { orders: AdminUserOrder[] }) {
  if (orders.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Sin pedidos todavía.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Fotos</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
              <TableCell>
                {order.status === "pending_verification" ? (
                  <Link href={ADMIN_PATHS.payments} className="underline underline-offset-4">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Link>
                ) : (
                  <Badge variant={order.status === "paid" ? "default" : "outline"}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {PAYMENT_METHODS.find((m) => m.id === order.paymentMethod)?.label ?? order.paymentMethod}
              </TableCell>
              <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
              <TableCell className="text-right tabular-nums">{formatUsd(order.totalCents)}</TableCell>
              <TableCell className="font-mono text-xs">{order.latestReference ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(order.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const CHANNEL_LABELS = { form: "Formulario", whatsapp: "WhatsApp" } as const
const STATUS_LABELS = { new: "Nuevo", answered: "Respondido", closed: "Cerrado" } as const

export function UserMessages({ messages }: { messages: AdminUserMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No ha escrito a soporte.
      </p>
    )
  }
  return (
    <ul className="divide-y rounded-md border">
      {messages.map((message) => (
        <li key={message.id} className="space-y-1.5 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{CHANNEL_LABELS[message.channel]}</Badge>
            <span>{STATUS_LABELS[message.status]}</span>
            <span>·</span>
            <span>{formatDateTime(message.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
        </li>
      ))}
    </ul>
  )
}

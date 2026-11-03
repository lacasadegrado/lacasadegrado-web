"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CircleCheck, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/common/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { ADMIN_QUERY_KEYS } from "@/common/lib/constants";
import { cn } from "@/common/lib/utils/cn.util";
import { formatDateTime } from "@/common/lib/utils/date.util";

import { markNotificationsReadAction } from "../../lib/actions/notification.action";
import { NOTIFICATIONS } from "../../lib/constants/notification.constants";
import type { NotificationsResponse } from "../../lib/types/notification.types";

const KIND_ICONS = {
  order_payment: Receipt,
  package_payment: Wallet,
  package_paid: CircleCheck,
} as const;

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch(NOTIFICATIONS.api, { cache: "no-store" });
  if (!response.ok) throw new Error(`notifications ${response.status}`);
  return response.json();
}

/**
 * The admin's inbox inside the app: new payments to review and packages
 * fully paid. Polls while the page is open; opening one marks it read.
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [marking, startMarking] = useTransition();
  const { data, isError } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.notifications,
    queryFn: fetchNotifications,
    refetchInterval: NOTIFICATIONS.pollMs,
    staleTime: NOTIFICATIONS.pollMs / 2,
  });
  const unread = data?.unread ?? 0;

  function markRead(notificationId: string | null) {
    startMarking(async () => {
      await markNotificationsReadAction({ notificationId });
      await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        >
          <Bell aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[0.65rem] font-semibold text-teal-950 tabular-nums"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-semibold">Notificaciones</p>
          {unread > 0 ? (
            <Button type="button" variant="ghost" size="sm" disabled={marking} onClick={() => markRead(null)}>
              Marcar todas como leídas
            </Button>
          ) : null}
        </div>
        {isError ? (
          <p className="p-4 text-sm text-muted-foreground" role="alert">
            No pudimos cargar las notificaciones. Se reintentará en un momento.
          </p>
        ) : !data ? (
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Cargando…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No tienes notificaciones. Aquí verás los pagos nuevos por revisar y los paquetes pagados.
          </p>
        ) : (
          <ul className="max-h-[min(28rem,70vh)] divide-y overflow-y-auto">
            {data.items.map((item) => {
              const Icon = KIND_ICONS[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      if (!item.readAt) markRead(item.id);
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 text-sm outline-none hover:bg-muted focus-visible:bg-muted",
                      !item.readAt && "bg-amber/10",
                    )}
                  >
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("font-medium", !item.readAt && "font-semibold")}>{item.title}</span>
                        {!item.readAt ? (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber">
                            <span className="sr-only">Sin leer</span>
                          </span>
                        ) : null}
                      </span>
                      {item.body ? <span className="block text-muted-foreground">{item.body}</span> : null}
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(new Date(item.createdAt))}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

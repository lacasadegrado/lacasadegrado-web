"use client";

import { usePathname } from "next/navigation";

import { ORDER_ID_ROUTE_PATTERNS } from "../constants/support.constants";

/** The order id in the current URL, when the page is about one order. */
export function useCurrentOrderId(): string | undefined {
  const pathname = usePathname();
  for (const pattern of ORDER_ID_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

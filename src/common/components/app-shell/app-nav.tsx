"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/common/lib/utils/cn.util";

const LINKS = [
  { href: "/dashboard", label: "Mis fotos", exact: true, slot: null, commerce: false, payments: false },
  { href: "/dashboard/payments", label: "Pagos", exact: false, slot: null, commerce: false, payments: true },
  { href: "/cart", label: "Carrito", exact: false, slot: "cart", commerce: true, payments: false },
  { href: "/dashboard/purchases", label: "Compras", exact: false, slot: null, commerce: true, payments: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavProps = {
  /** Rendered inside the cart link, e.g. an item count. */
  cartBadge?: ReactNode;
  /** Hide the cart and purchases links, for people with free access. */
  showCommerce?: boolean;
  /** "Pagos", for people signed up for a photo package. */
  showPayments?: boolean;
};

/** Primary navigation for signed-in pages. Sits under the site header. */
export function AppNav({ cartBadge, showCommerce = true, showPayments = false }: AppNavProps) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => (showCommerce || !link.commerce) && (showPayments || !link.payments));

  return (
    <nav aria-label="Principal" className="border-b">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
        {links.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm whitespace-nowrap",
                  active
                    ? "border-amber font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
                {link.slot === "cart" ? cartBadge : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

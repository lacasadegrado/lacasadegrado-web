"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/common/lib/utils/cn.util";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";

const LINKS = [
  { href: ADMIN_PATHS.events, label: "Eventos" },
  { href: ADMIN_PATHS.photos, label: "Fotos" },
  { href: ADMIN_PATHS.payments, label: "Pagos" },
  { href: ADMIN_PATHS.rates, label: "Tasa" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administración" className="border-b">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm whitespace-nowrap",
                  active
                    ? "border-foreground font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

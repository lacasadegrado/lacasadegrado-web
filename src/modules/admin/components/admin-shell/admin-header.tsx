"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/common/components/theme-toggle/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/common/components/ui/breadcrumb";
import { Separator } from "@/common/components/ui/separator";
import { SidebarTrigger } from "@/common/components/ui/sidebar";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";
import { ADMIN_SECTIONS } from "./admin-sidebar";

export function AdminHeader() {
  const pathname = usePathname();
  const section = ADMIN_SECTIONS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar el menú" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink asChild>
              <Link href={ADMIN_PATHS.root}>Administración</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {section ? (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{section.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

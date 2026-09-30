"use client"

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  ChevronsUpDown,
  Globe,
  Images,
  LogOut,
  Printer,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Logo } from "@/common/components/logo/logo"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/common/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/common/components/ui/sidebar"
import { cn } from "@/common/lib/utils/cn.util"
import { signOutAction } from "@/modules/auth/lib/actions/auth.action"

import { ADMIN_PATHS } from "../../lib/constants/admin.constants"

type AdminBadge = "payments" | "prints"

type AdminNavLink = {
  href: string
  label: string
  badge?: AdminBadge
}

/**
 * A top-level entry: either a link, or a collapsible group whose `href`
 * is only its base path (the breadcrumb links it) and whose `items` are
 * the pages.
 */
export type AdminSection = AdminNavLink & {
  icon: LucideIcon
  items?: readonly AdminNavLink[]
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: ADMIN_PATHS.events,
    label: "Eventos",
    icon: CalendarDays,
    items: [
      { href: ADMIN_PATHS.events, label: "Todos los eventos" },
      { href: ADMIN_PATHS.eventForms, label: "Formularios" },
    ],
  },
  { href: ADMIN_PATHS.photos, label: "Fotos", icon: Images },
  {
    href: ADMIN_PATHS.payments,
    label: "Pagos",
    icon: Wallet,
    items: [
      { href: ADMIN_PATHS.payments, label: "Fotos adicionales", badge: "payments" },
      { href: ADMIN_PATHS.packagePayments, label: "Paquetes" },
    ],
  },
  { href: ADMIN_PATHS.prints, label: "Impresiones", icon: Printer, badge: "prints" },
  { href: ADMIN_PATHS.rates, label: "Tasa", icon: ArrowLeftRight },
  { href: ADMIN_PATHS.users, label: "Personas", icon: Users },
]

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The section and page for a path. Pages are matched by the longest
 * href, so `/admin/payments/packages` is "Paquetes" and not "Fotos
 * adicionales", whose href is a prefix of it.
 */
export function matchAdminSection(
  pathname: string,
): { section: AdminSection; page?: AdminNavLink } | undefined {
  let best: { section: AdminSection; page?: AdminNavLink; length: number } | undefined
  for (const section of ADMIN_SECTIONS) {
    for (const page of section.items ?? [section]) {
      if (matches(pathname, page.href) && page.href.length > (best?.length ?? -1)) {
        best = { section, page: section.items ? page : undefined, length: page.href.length }
      }
    }
  }
  return best ? { section: best.section, page: best.page } : undefined
}

const BADGE_LABEL: Record<AdminBadge, string> = {
  payments: "pagos por verificar",
  prints: "impresiones por entregar",
}

const ACTIVE_CLASS =
  "data-active:bg-amber data-active:text-teal-950 data-active:font-semibold"

function badgeClass(active: boolean): string {
  return active ? "bg-teal-950/20 text-teal-950" : "bg-amber text-teal-950"
}

type AdminSidebarProps = {
  email: string
  pendingPayments: number
  pendingPrints: number
}

export function AdminSidebar({ email, pendingPayments, pendingPrints }: AdminSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const current = matchAdminSection(pathname)
  const counts: Record<AdminBadge, number> = {
    payments: pendingPayments,
    prints: pendingPrints,
  }

  function closeOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  function renderBadge(link: AdminNavLink, active: boolean, className?: string) {
    const value = link.badge ? counts[link.badge] : 0
    if (!link.badge || value <= 0) return null
    return (
      <SidebarMenuBadge
        className={cn(badgeClass(active), className)}
        aria-label={`${value} ${BADGE_LABEL[link.badge]}`}
      >
        {value}
      </SidebarMenuBadge>
    )
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={ADMIN_PATHS.root} className="text-cream">
                <Logo
                  kind="house"
                  variant="cream"
                  title=""
                  className="h-8 w-auto"
                />
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">
                    La Casa de Grado
                  </span>
                  <span className="truncate text-xs text-cream/70">
                    Administración
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-cream/60">
            Gestión
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_SECTIONS.map((section) => {
                const inSection = current?.section === section

                if (!section.items) {
                  return (
                    <SidebarMenuItem key={section.href}>
                      <SidebarMenuButton asChild isActive={inSection} className={ACTIVE_CLASS}>
                        <Link href={section.href} onClick={closeOnMobile}>
                          <section.icon aria-hidden="true" />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {renderBadge(section, inSection)}
                    </SidebarMenuItem>
                  )
                }

                // Open by default where the admin is, or where something is pending.
                const hasPending = section.items.some(
                  (item) => item.badge && counts[item.badge] > 0,
                )
                return (
                  <Collapsible
                    key={section.href}
                    asChild
                    defaultOpen={inSection || hasPending}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={inSection ? "font-semibold" : undefined}>
                          <section.icon aria-hidden="true" />
                          <span>{section.label}</span>
                          <ChevronRight
                            aria-hidden="true"
                            className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 motion-reduce:transition-none"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.items.map((item) => {
                            const active = current?.page === item
                            return (
                              <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={active}
                                  className={cn(ACTIVE_CLASS, item.badge && "pr-8")}
                                >
                                  <Link
                                    href={item.href}
                                    onClick={closeOnMobile}
                                    aria-current={active ? "page" : undefined}
                                  >
                                    <span>{item.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {renderBadge(item, active, "top-1")}
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <Link href="/dashboard">
                    <Globe aria-hidden="true" />
                    <span>Ver el sitio como cliente</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber font-heading text-sm text-teal-950">
                    {email.slice(0, 1).toUpperCase() || "A"}
                  </span>
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Administrador</span>
                    <span className="truncate text-xs text-cream/70">
                      {email}
                    </span>
                  </span>
                  <ChevronsUpDown
                    className="ml-auto size-4"
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <Globe aria-hidden="true" />
                    Ver el sitio como cliente
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

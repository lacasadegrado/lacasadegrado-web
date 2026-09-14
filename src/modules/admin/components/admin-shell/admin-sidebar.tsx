"use client"

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronsUpDown,
  Globe,
  Images,
  LogOut,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Logo } from "@/common/components/logo/logo"
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
  useSidebar,
} from "@/common/components/ui/sidebar"
import { signOutAction } from "@/modules/auth/lib/actions/auth.action"

import { ADMIN_PATHS } from "../../lib/constants/admin.constants"

export const ADMIN_SECTIONS = [
  { href: ADMIN_PATHS.events, label: "Eventos", icon: CalendarDays },
  { href: ADMIN_PATHS.photos, label: "Fotos", icon: Images },
  { href: ADMIN_PATHS.payments, label: "Pagos", icon: Wallet },
  { href: ADMIN_PATHS.rates, label: "Tasa", icon: ArrowLeftRight },
  { href: ADMIN_PATHS.users, label: "Personas", icon: Users },
] as const

type AdminSidebarProps = {
  email: string
  pendingPayments: number
}

export function AdminSidebar({ email, pendingPayments }: AdminSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

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
                const active =
                  pathname === section.href ||
                  pathname.startsWith(`${section.href}/`)
                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="data-active:bg-amber data-active:text-teal-950 data-active:font-semibold"
                    >
                      <Link
                        href={section.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false)
                        }}
                      >
                        <section.icon aria-hidden="true" />
                        <span>{section.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {section.href === ADMIN_PATHS.payments &&
                    pendingPayments > 0 ? (
                      <SidebarMenuBadge
                        className={
                          active
                            ? "bg-teal-950/20 text-teal-950"
                            : "bg-amber text-teal-950"
                        }
                        aria-label={`${pendingPayments} pagos por verificar`}
                      >
                        {pendingPayments}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
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

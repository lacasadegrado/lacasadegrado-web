import type { ReactNode } from "react";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";

import { AppNav } from "./app-nav";

type AppShellProps = {
  /** Right side of the header: session controls. */
  actions?: ReactNode;
  /** Rendered inside the cart nav link. */
  cartBadge?: ReactNode;
  /** Floating help entry point, rendered after the footer. */
  support?: ReactNode;
  /** False for people with free access: no cart, no purchases. */
  showCommerce?: boolean;
  /** True for people with a photo package: the "Pagos" tab. */
  showPayments?: boolean;
  children: ReactNode;
};

/** Layout for every signed-in page: header, primary nav, content, footer. */
export function AppShell({
  actions,
  cartBadge,
  support,
  showCommerce = true,
  showPayments = false,
  children,
}: AppShellProps) {
  return (
    <>
      {/* `data-app-chrome`: hidden on phones by full-screen flows (see `data-immersive` in globals.css). */}
      <div data-app-chrome className="contents">
        <SiteHeader>{actions}</SiteHeader>
        <AppNav cartBadge={showCommerce ? cartBadge : null} showCommerce={showCommerce} showPayments={showPayments} />
      </div>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6">
        {children}
      </main>
      <div data-app-chrome className="contents">
        <SiteFooter />
      </div>
      {support}
    </>
  );
}

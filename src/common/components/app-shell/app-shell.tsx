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
  children: ReactNode;
};

/** Layout for every signed-in page: header, primary nav, content, footer. */
export function AppShell({ actions, cartBadge, support, children }: AppShellProps) {
  return (
    <>
      <SiteHeader>{actions}</SiteHeader>
      <AppNav cartBadge={cartBadge} />
      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6"
      >
        {children}
      </main>
      <SiteFooter />
      {support}
    </>
  );
}

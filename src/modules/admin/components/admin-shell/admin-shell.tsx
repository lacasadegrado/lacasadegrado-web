import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/common/components/site-header/site-header";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";

import { AdminNav } from "./admin-nav";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader>
        <Badge variant="outline" className="hidden sm:inline-flex">
          Administración
        </Badge>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Ver sitio</Link>
        </Button>
        <SignOutButton />
      </SiteHeader>
      <AdminNav />
      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
      >
        {children}
      </main>
    </>
  );
}

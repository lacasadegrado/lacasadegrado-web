import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";
import { Button } from "@/common/components/ui/button";
import { formatDateOnly } from "@/common/lib/utils/date.util";
import { AUTH_PATHS } from "@/modules/auth/lib/constants/auth.constants";
import { getHomePath } from "@/modules/auth/lib/services/access.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { LEGAL_UPDATED_ON } from "../lib/constants/legal.constants";

type LegalPageProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

/** Frame shared by the legal pages: public header, readable column, footer. */
export async function LegalPage({ title, intro, children }: LegalPageProps) {
  const user = await getSessionUser();
  const ctaHref = user ? await getHomePath(user) : AUTH_PATHS.login;

  return (
    <>
      <SiteHeader>
        <Button asChild variant="ghost" size="sm">
          <Link href={ctaHref}>{user ? "Volver a la app" : "Iniciar sesión"}</Link>
        </Button>
      </SiteHeader>
      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm text-muted-foreground">
          Última actualización: {formatDateOnly(LEGAL_UPDATED_ON)}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-prose text-base text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-10 [&_h2]:text-xl [&_h2]:mb-3 [&_p]:max-w-prose [&_p]:leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:max-w-prose [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:leading-relaxed">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

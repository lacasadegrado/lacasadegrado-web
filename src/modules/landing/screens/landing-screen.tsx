import Link from "next/link";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";
import { Button } from "@/common/components/ui/button";
import { AUTH_PATHS } from "@/modules/auth/lib/constants/auth.constants";
import { getHomePath } from "@/modules/auth/lib/services/access.service";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { HowItWorks } from "../components/how-it-works";
import { LandingFaq } from "../components/landing-faq";
import { LandingHero } from "../components/landing-hero";
import { PublishedEvents } from "../components/published-events";
import { listPublishedEvents } from "../lib/services/landing.service";

export async function LandingScreen() {
  const [user, events] = await Promise.all([getSessionUser(), listPublishedEvents()]);
  // Admins are sent to the panel; the sidebar has "Ver el sitio como cliente".
  const ctaHref = user ? await getHomePath(user) : AUTH_PATHS.login;
  const isAdmin = ctaHref !== AUTH_PATHS.afterLogin && Boolean(user);
  const signedInLabel = isAdmin ? "Ir al panel" : "Ir a mis fotos";

  return (
    <>
      <SiteHeader>
        <Button asChild variant={user ? "default" : "ghost"} size="sm">
          <Link href={ctaHref}>{user ? signedInLabel : "Iniciar sesión"}</Link>
        </Button>
      </SiteHeader>
      <main id="contenido" className="flex-1">
        <LandingHero ctaHref={ctaHref} ctaLabel={user ? signedInLabel : "Ver mis fotos"} />
        <HowItWorks />
        <PublishedEvents events={events} />
        <LandingFaq />
      </main>
      <SiteFooter />
    </>
  );
}

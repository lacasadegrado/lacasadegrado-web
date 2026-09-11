import Link from "next/link";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";
import { Button } from "@/common/components/ui/button";
import { AUTH_PATHS } from "@/modules/auth/lib/constants/auth.constants";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { HowItWorks } from "../components/how-it-works";
import { LandingFaq } from "../components/landing-faq";
import { LandingHero } from "../components/landing-hero";
import { PublishedEvents } from "../components/published-events";
import { listPublishedEvents } from "../lib/services/landing.service";

export async function LandingScreen() {
  const [user, events] = await Promise.all([getSessionUser(), listPublishedEvents()]);
  const ctaHref = user ? AUTH_PATHS.afterLogin : AUTH_PATHS.login;

  return (
    <>
      <SiteHeader>
        <Button asChild variant={user ? "default" : "ghost"} size="sm">
          <Link href={ctaHref}>{user ? "Ir a mis fotos" : "Iniciar sesión"}</Link>
        </Button>
      </SiteHeader>
      <main id="contenido" className="flex-1">
        <LandingHero ctaHref={ctaHref} ctaLabel={user ? "Ir a mis fotos" : "Ver mis fotos"} />
        <HowItWorks />
        <PublishedEvents events={events} />
        <LandingFaq />
      </main>
      <SiteFooter />
    </>
  );
}

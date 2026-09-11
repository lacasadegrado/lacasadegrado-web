import Link from "next/link";

import { BrandPattern } from "@/common/components/brand-pattern/brand-pattern";
import { Logo } from "@/common/components/logo/logo";
import { Button } from "@/common/components/ui/button";

type LandingHeroProps = {
  ctaHref: string;
  ctaLabel: string;
};

export function LandingHero({ ctaHref, ctaLabel }: LandingHeroProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl xl:text-5xl">
          Tus fotos de grado, listas para descargar.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Entra con el correo que diste en tu graduación, revisa las fotos donde apareces,
          compra las que quieras y descárgalas en alta resolución.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          <p className="text-sm text-muted-foreground">Sin contraseña. Sin costo por mirar.</p>
        </div>
      </div>

      {/* Brand panel: the house mark on the brand's own teal, in both themes. */}
      <div className="relative hidden aspect-[4/3] overflow-hidden rounded-3xl bg-teal text-cream lg:block">
        <BrandPattern variant="rings" size={68} className="text-cream opacity-[0.09]" />
        <div className="relative flex h-full items-center justify-center p-12">
          <Logo kind="house" variant="cream" title="" className="h-40 w-auto" />
        </div>
      </div>
    </section>
  );
}

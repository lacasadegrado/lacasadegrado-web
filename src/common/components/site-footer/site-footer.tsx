import Link from "next/link";

import { Logo } from "@/common/components/logo/logo";
import { BRAND } from "@/common/lib/constants/brand";
import { LEGAL_PATHS } from "@/modules/legal/lib/constants/legal.constants";

/** Teal band in both themes: the brand's own surface closes every page. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-teal text-cream">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo variant="cream" title="" className="h-9" />
        <div className="flex flex-col gap-2 text-sm text-cream/80 sm:items-end">
          <nav aria-label="Legal" className="flex gap-4">
            <Link href={LEGAL_PATHS.terms} className="underline-offset-4 hover:text-cream hover:underline">
              Términos y condiciones
            </Link>
            <Link href={LEGAL_PATHS.privacy} className="underline-offset-4 hover:text-cream hover:underline">
              Privacidad
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

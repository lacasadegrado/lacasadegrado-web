import { Logo } from "@/common/components/logo/logo";
import { BRAND } from "@/common/lib/constants/brand";

/** Teal band in both themes: the brand's own surface closes every page. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-teal text-cream">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo variant="cream" title="" className="h-9" />
        <p className="text-sm text-cream/80">
          © {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

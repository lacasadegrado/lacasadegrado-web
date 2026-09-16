import Link from "next/link";

import { BrandPattern } from "@/common/components/brand-pattern/brand-pattern";
import { Logo } from "@/common/components/logo/logo";

import { LEGAL_PATHS } from "@/modules/legal/lib/constants/legal.constants";

import { LoginForm } from "../components/login-form/login-form";
import { sanitizeNextPath } from "../lib/utils/auth.util";

type LoginScreenProps = {
  next?: string;
};

export function LoginScreen({ next }: LoginScreenProps) {
  const safeNext = sanitizeNextPath(next, "");

  return (
    <main id="contenido" className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel: teal in both themes, the house pattern behind. */}
      <aside className="relative hidden overflow-hidden bg-teal text-cream lg:flex lg:flex-col lg:justify-between lg:p-10">
        <BrandPattern variant="houses" size={132} className="text-cream opacity-[0.07]" />
        <Link href="/" className="relative self-start rounded-md">
          <Logo variant="cream" className="h-10" />
        </Link>
        <div className="relative max-w-sm">
          <h2 className="text-2xl text-cream">Tus fotos de grado, listas para descargar.</h2>
          <p className="mt-4 text-base text-cream/80">
            Entra con tu correo, elige las fotos donde apareces y descárgalas en alta
            resolución en cuanto confirmemos tu pago.
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 block w-fit rounded-md text-primary lg:hidden dark:text-cream">
            <Logo className="h-9" />
          </Link>
          <h1 className="text-2xl">Entra para ver tus fotos</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Usa el correo que diste el día de tu graduación. Ahí es donde el fotógrafo asoció tus
            fotos.
          </p>
          <div className="mt-8">
            <LoginForm next={safeNext || undefined} />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Al continuar aceptas los{" "}
            <Link href={LEGAL_PATHS.terms} className="underline underline-offset-4">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-4">
              política de privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

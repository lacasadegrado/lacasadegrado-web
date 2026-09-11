import Link from "next/link";

import { Logo } from "@/common/components/logo/logo";
import { Button } from "@/common/components/ui/button";

export function NotFoundScreen() {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-10 block w-fit rounded-md text-primary dark:text-cream">
          <Logo className="h-9" />
        </Link>
        <h1 className="text-2xl">Esta página no existe</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

import { Button } from "@/common/components/ui/button";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

export function PurchasesEmptyState() {
  return (
    <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
      <h2 className="text-xl font-bold">Todavía no tienes fotos compradas</h2>
      <p className="mt-3 text-base text-muted-foreground">
        Cuando aprobemos tu pago, las fotos aparecen aquí sin marca de agua y listas para
        descargar en alta resolución.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href={GALLERY_PATHS.dashboard}>Elegir fotos</Link>
        </Button>
      </div>
    </section>
  );
}

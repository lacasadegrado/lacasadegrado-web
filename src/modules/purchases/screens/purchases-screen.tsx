import { Button } from "@/common/components/ui/button";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { PurchasesEmptyState } from "../components/purchases-empty-state";
import { PurchasesEventSection } from "../components/purchases-event-section";
import { PURCHASES_PATHS } from "../lib/constants/purchases.constants";
import { listPurchasesForUser } from "../lib/services/purchases.service";

export async function PurchasesScreen() {
  const user = await requireSessionUser(PURCHASES_PATHS.purchases);
  const events = await listPurchasesForUser(user);
  const total = events.reduce((sum, event) => sum + event.photos.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis compras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0
              ? "Tus fotos en alta resolución, cuando el pago esté aprobado."
              : `${total} foto${total === 1 ? "" : "s"} en alta resolución, sin marca de agua. Cada descarga es el archivo original.`}
          </p>
        </div>
        {total > 1 ? (
          <Button asChild variant="outline" size="lg" className="h-10">
            <a href={PURCHASES_PATHS.downloadAllApi} download>
              Descargar todas (.zip)
            </a>
          </Button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <PurchasesEmptyState />
      ) : (
        events.map((event) => <PurchasesEventSection key={event.id} event={event} />)
      )}
    </div>
  );
}

import { PaymentReviewCard } from "../components/payment-queue/payment-review-card";
import { RecentReviewsTable } from "../components/payment-queue/recent-reviews-table";
import { listPendingReviews, listRecentReviews } from "../lib/services/payment-review.service";

export async function AdminPaymentsScreen() {
  const [pending, recent] = await Promise.all([listPendingReviews(), listRecentReviews(10)]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Pagos por verificar</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Confirma en el banco que la referencia y el monto llegaron antes de aprobar. Aprobar
          habilita las descargas de inmediato.
        </p>
      </div>

      <section aria-labelledby="queue-heading" className="space-y-4">
        <h2 id="queue-heading" className="text-lg font-semibold">
          {pending.length === 0
            ? "Nada pendiente"
            : `${pending.length} pendiente${pending.length === 1 ? "" : "s"}`}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No hay pagos esperando revisión. Los nuevos aparecerán aquí en cuanto alguien envíe sus
            datos.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <PaymentReviewCard key={item.payment.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="text-lg font-semibold">
          Últimas decisiones
        </h2>
        <RecentReviewsTable items={recent} />
      </section>
    </div>
  );
}

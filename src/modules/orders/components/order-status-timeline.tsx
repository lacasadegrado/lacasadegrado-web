import { cn } from "@/common/lib/utils/cn.util";
import { formatDateTime } from "@/common/lib/utils/date.util";

import type { OrderDetail } from "../lib/types/orders.types";

type Step = {
  key: string;
  title: string;
  detail?: string;
  state: "done" | "current" | "todo";
};

function buildSteps(order: OrderDetail): Step[] {
  const latest = order.payments[0];
  const created: Step = {
    key: "created",
    title: "Pedido creado",
    detail: formatDateTime(order.createdAt),
    state: "done",
  };

  if (order.status === "pending_payment") {
    return [
      created,
      { key: "pay", title: "Pago pendiente", detail: "Aún no recibimos tus datos de pago.", state: "current" },
      { key: "review", title: "Revisión", state: "todo" },
      { key: "result", title: "Fotos listas", state: "todo" },
    ];
  }

  const submitted: Step = {
    key: "submitted",
    title: "Datos de pago enviados",
    detail: latest ? `${formatDateTime(latest.submittedAt)} · Ref. ${latest.reference}` : undefined,
    state: "done",
  };

  if (order.status === "pending_verification") {
    return [
      created,
      submitted,
      { key: "review", title: "En revisión", detail: "Estamos confirmando el pago con el banco.", state: "current" },
      { key: "result", title: "Fotos listas", state: "todo" },
    ];
  }

  if (order.status === "paid") {
    return [
      created,
      submitted,
      { key: "review", title: "Pago verificado", detail: order.paidAt ? formatDateTime(order.paidAt) : undefined, state: "done" },
      { key: "result", title: "Fotos listas para descargar", state: "current" },
    ];
  }

  if (order.status === "rejected") {
    return [
      created,
      submitted,
      {
        key: "review",
        title: "Pago rechazado",
        detail: latest?.rejectionReason ?? "No pudimos confirmar el pago.",
        state: "current",
      },
      { key: "result", title: "Fotos listas", state: "todo" },
    ];
  }

  return [created, { key: "cancelled", title: "Pedido cancelado", state: "current" }];
}

export function OrderStatusTimeline({ order }: { order: OrderDetail }) {
  const steps = buildSteps(order);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-5 left-[7px] h-full w-px",
                  step.state === "done" ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-1 size-4 shrink-0 rounded-full border-2",
                step.state === "done" && "border-foreground bg-foreground",
                step.state === "current" && "border-foreground bg-background",
                step.state === "todo" && "border-border bg-background",
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm",
                  step.state === "todo" ? "text-muted-foreground" : "font-semibold",
                )}
              >
                {step.title}
                {step.state === "current" ? <span className="sr-only"> (estado actual)</span> : null}
              </p>
              {step.detail ? (
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

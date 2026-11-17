import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatEur, formatVes } from "@/common/lib/utils/money.util";
import { OpenSupportButton } from "@/modules/support/components/open-support-button/open-support-button";

import { PLAN_PAY_STEPS, type PlanPayStep } from "../../lib/constants/plans.constants";
import { installmentCountLabel } from "../../lib/utils/plan-installments.util";

/** Back arrow, help, "Paso 2 de 4" and the one question this screen asks. Every step renders it. */
export function PayStepHeader({ step, backHref, title }: { step: PlanPayStep; backHref: string; title: string }) {
  const number = PLAN_PAY_STEPS.indexOf(step) + 1;
  return (
    <div className="space-y-3">
      {/* Phones: hide the site header, nav and footer while paying (globals.css). */}
      <span data-immersive hidden />
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-amber"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Atrás
        </Link>
        <OpenSupportButton />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Paso {number} de {PLAN_PAY_STEPS.length}
        </p>
        <div
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${PLAN_PAY_STEPS.length}, 1fr)` }}
          aria-hidden="true"
        >
          {PLAN_PAY_STEPS.map((item, index) => (
            <span key={item} className={`h-1 rounded-full ${index < number ? "bg-amber" : "bg-muted"}`} />
          ))}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      </div>
    </div>
  );
}

/**
 * The bar fixed at the bottom while paying: what you are paying and the
 * one button that moves you forward. The page leaves room for it (`pb-44`).
 */
export function PayBottomBar({
  totalCents,
  eurToVes,
  count,
  installments,
  children,
}: {
  totalCents: number | null;
  eurToVes: number | null;
  count: number | null;
  installments: number;
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-[0_-2px_12px_rgba(19,80,101,0.1)] backdrop-blur">
      <div className="mx-auto max-w-lg space-y-3 px-4 py-3">
        {totalCents !== null ? (
          <dl className="space-y-0.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-base font-semibold">Total</dt>
              <dd className="text-right text-base font-semibold tabular-nums">
                {eurToVes ? `${formatVes(totalCents, eurToVes)} / ` : ""}
                {formatEur(totalCents)}
              </dd>
            </div>
            {installments > 1 && count ? (
              <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                <dt>Pagas</dt>
                <dd className="tabular-nums">{installmentCountLabel(count)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {children}
      </div>
    </div>
  );
}

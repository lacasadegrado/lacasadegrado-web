"use client";

import { useState } from "react";

import type { PaymentMethod, PlanPaymentMethod } from "@/common/lib/db/schema";
import type { PaymentAccounts } from "@/modules/checkout/lib/schemas/payment-account.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";

import type { PlanContactMethodId } from "../../lib/constants/plans.constants";
import { PlanPayMethods } from "../plan-pay-methods/plan-pay-methods";
import { PlanPaymentForm } from "../plan-payment-form/plan-payment-form";

type MethodOption<T extends string> = { id: T; label: string; description: string };

type PlanPayFlowProps = {
  planId: string;
  fields: FormField[];
  priceCents: number;
  installments: number;
  reserved: number;
  eurToVes: number | null;
  /** "La próxima cuota es de…", already formatted by the server. */
  nextAmountText: string;
  methods: MethodOption<PaymentMethod>[];
  accounts: PaymentAccounts;
  contactMethods: readonly MethodOption<PlanContactMethodId>[];
  contact: { phone: string; whatsapp: string };
  contactAbout: string;
};

/**
 * "Cómo pagar" and "Reportar un pago" share one choice: the method picked
 * above decides what details show and is sent with the payment.
 */
export function PlanPayFlow(props: PlanPayFlowProps) {
  const [method, setMethod] = useState<PlanPaymentMethod | null>(null);

  return (
    <>
      <section aria-labelledby="plan-pay" className="space-y-4">
        <div>
          <h2 id="plan-pay" className="text-xl">
            Cómo pagar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.nextAmountText}</p>
        </div>
        <PlanPayMethods
          methods={props.methods}
          accounts={props.accounts}
          contactMethods={props.contactMethods}
          contact={props.contact}
          contactAbout={props.contactAbout}
          selected={method}
          onSelect={setMethod}
        />
      </section>
      <section aria-labelledby="plan-next" className="space-y-6">
        <div>
          <h2 id="plan-next" className="text-xl">
            Reportar un pago
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando hayas pagado, elige cuántas cuotas cubre y envíanos los datos del pago.
          </p>
        </div>
        <PlanPaymentForm
          planId={props.planId}
          fields={props.fields}
          priceCents={props.priceCents}
          installments={props.installments}
          reserved={props.reserved}
          eurToVes={props.eurToVes}
          method={method}
        />
      </section>
    </>
  );
}

import { formatDateTime } from "@/common/lib/utils/date.util";
import { getPlanPaymentForm } from "@/modules/plans/lib/services/plan-payment-form.service";

import { PaymentFormBuilder } from "../components/payment-form/payment-form-builder";

/** Configuración › Formulario de pagos: what every package installment asks in "Pagos". */
export async function AdminPaymentFormScreen() {
  const { fields, updatedAt } = await getPlanPaymentForm();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Formulario de pagos</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Las preguntas que responde cada persona al reportar una cuota de su paquete en Pagos. Es uno solo para todos
          los eventos. Los cambios valen para los pagos nuevos; cada pago ya enviado guarda las preguntas tal como las
          vio.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {updatedAt ? `Última modificación: ${formatDateTime(updatedAt)}` : "Todavía usa las preguntas de siempre."}
        </p>
      </div>
      <PaymentFormBuilder initialFields={fields} />
    </div>
  );
}

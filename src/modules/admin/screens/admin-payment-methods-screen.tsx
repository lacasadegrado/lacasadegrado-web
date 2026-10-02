import { getPaymentAccounts } from "@/modules/checkout/lib/services/payment-account.service";

import { PaymentAccountForm } from "../components/payment-accounts/payment-account-form";

/** Configuración › Métodos de pago: the receiving details customers pay to. */
export async function AdminPaymentMethodsScreen() {
  const { accounts, updatedAt } = await getPaymentAccounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Métodos de pago</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Los datos que ve el cliente en la pantalla de pago, con un botón para copiar cada uno.
          Revísalos bien: un dígito equivocado manda el pago a otra cuenta. Los cambios se ven de
          inmediato en los pedidos nuevos y en los que están esperando pago.
        </p>
      </div>

      <PaymentAccountForm
        method="pago_movil"
        title="Pago Móvil"
        accounts={accounts}
        updatedAt={updatedAt.pago_movil}
      />
      <PaymentAccountForm
        method="bank_transfer"
        title="Transferencia bancaria"
        accounts={accounts}
        updatedAt={updatedAt.bank_transfer}
      />
    </div>
  );
}

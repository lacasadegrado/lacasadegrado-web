import { CheckoutFlow } from "../components/checkout-flow";

export function CheckoutScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pagar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirma tus fotos y elige cómo pagar. El precio en bolívares usa la tasa del día.
        </p>
      </div>
      <CheckoutFlow />
    </div>
  );
}

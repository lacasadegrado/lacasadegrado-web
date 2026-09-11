import { CartList } from "../components/cart-list";

export function CartScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa tu selección antes de pagar. Puedes quitar fotos aquí.
        </p>
      </div>
      <CartList />
    </div>
  );
}

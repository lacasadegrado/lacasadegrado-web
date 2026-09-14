import { redirect } from "next/navigation";

import { getViewerAccess } from "@/modules/auth/lib/services/access.service";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import { CartList } from "../components/cart-list";
import { CART_PATHS } from "../lib/constants/cart.constants";

export async function CartScreen() {
  const user = await requireSessionUser(CART_PATHS.cart);
  const access = await getViewerAccess(user);
  // People with free access have nothing to buy; the nav hides this page too.
  if (access.complimentary) redirect(GALLERY_PATHS.dashboard);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Carrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa tu selección antes de pagar. Puedes quitar fotos aquí.
        </p>
      </div>
      <CartList />
    </div>
  );
}

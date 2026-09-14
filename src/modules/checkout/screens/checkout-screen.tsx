import { redirect } from "next/navigation";

import { getViewerAccess } from "@/modules/auth/lib/services/access.service";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { GALLERY_PATHS } from "@/modules/gallery/lib/constants/gallery.constants";

import { CheckoutFlow } from "../components/checkout-flow";
import { CHECKOUT_PATHS } from "../lib/constants/checkout.constants";

export async function CheckoutScreen() {
  const user = await requireSessionUser(CHECKOUT_PATHS.checkout);
  const access = await getViewerAccess(user);
  if (access.complimentary) redirect(GALLERY_PATHS.dashboard);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Pagar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirma tus fotos y elige cómo pagar. El precio en bolívares usa la tasa del día.
        </p>
      </div>
      <CheckoutFlow />
    </div>
  );
}

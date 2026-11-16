import { redirect } from "next/navigation";

import { buildLoginUrl } from "@/modules/auth/lib/utils/auth.util";
import { PLANS_PATHS } from "@/modules/plans/lib/constants/plans.constants";

/**
 * Old private payment links (before "Pagos"). They no longer open a plan:
 * the person signs in and lands on their payments.
 */
export default function Page(): never {
  redirect(buildLoginUrl(PLANS_PATHS.list));
}

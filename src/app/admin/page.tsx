import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";

export default function Page() {
  redirect(ADMIN_PATHS.events);
}

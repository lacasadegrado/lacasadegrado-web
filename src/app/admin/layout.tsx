import type { ReactNode } from "react";

import { AdminShell } from "@/modules/admin/components/admin-shell/admin-shell";
import { requireAdmin } from "@/modules/admin/lib/services/admin-access.service";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/common/components/ui/sidebar";
import { TooltipProvider } from "@/common/components/ui/tooltip";
import { getSessionUser } from "@/modules/auth/lib/services/session.service";

import { countPendingReviews } from "../../lib/services/payment-review.service";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

/**
 * Admin frame: teal sidebar with the sections, content in an inset card.
 * The layout above has already verified the session is an admin.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const [user, pendingPayments] = await Promise.all([getSessionUser(), countPendingReviews()]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar email={user?.email ?? ""} pendingPayments={pendingPayments} />
        <SidebarInset id="contenido" className="min-w-0">
          <AdminHeader />
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

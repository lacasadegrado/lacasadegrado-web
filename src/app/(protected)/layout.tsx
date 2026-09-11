import type { ReactNode } from "react";

import { AppShell } from "@/common/components/app-shell/app-shell";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import { requireSessionUser } from "@/modules/auth/lib/services/session.service";
import { CartCount } from "@/modules/cart/components/cart-count";
import { SupportLauncher } from "@/modules/support/components/support-launcher/support-launcher";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Second check after the proxy: layouts are not a security boundary on
  // their own, but this keeps the shell from rendering for anonymous hits.
  const user = await requireSessionUser();

  return (
    <AppShell
      actions={<SignOutButton />}
      cartBadge={<CartCount />}
      support={<SupportLauncher email={user.email} />}
    >
      {children}
    </AppShell>
  );
}

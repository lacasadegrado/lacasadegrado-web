import { Button } from "@/common/components/ui/button";

import { signOutAction } from "../lib/actions/auth.action";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        Cerrar sesión
      </Button>
    </form>
  );
}

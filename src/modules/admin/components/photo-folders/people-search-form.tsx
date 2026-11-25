import { Search } from "lucide-react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { ADMIN_PATHS } from "../../lib/constants/admin.constants";

/**
 * Searches a person's folders in every event. A plain GET form: it works
 * before hydration and the result is a link the admin can share.
 */
export function PeopleSearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action={ADMIN_PATHS.photos} role="search" className="max-w-xl space-y-2">
      <Label htmlFor="people-search">¿Buscas las fotos de alguien?</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="people-search"
            name="buscar"
            type="search"
            defaultValue={defaultValue}
            placeholder="Escribe su nombre o correo"
            minLength={2}
            required
            className="pl-8"
          />
        </div>
        <Button type="submit">Buscar</Button>
      </div>
      <p className="text-sm text-muted-foreground">Busca en todos los eventos.</p>
    </form>
  );
}

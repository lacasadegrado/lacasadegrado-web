"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/common/components/ui/button";

const subscribe = () => () => {};

/**
 * Light / dark switch. Renders a neutral placeholder until mounted, since
 * the resolved theme is only known in the browser.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={mounted ? label : "Cambiar tema"}
      title={mounted ? label : undefined}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

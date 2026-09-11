import type { ReactNode } from "react";

import { QueryProvider } from "./query.provider";
import { ThemeProvider } from "./theme.provider";

/** Composes every app-wide provider. Add new ones here, innermost last. */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}

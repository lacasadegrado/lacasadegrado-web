import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/common/components/logo/logo";
import { ThemeToggle } from "@/common/components/theme-toggle/theme-toggle";
import { cn } from "@/common/lib/utils/cn.util";

type SiteHeaderProps = {
  /** Right-side content: navigation, session controls. */
  children?: ReactNode;
  className?: string;
};

export function SiteHeader({ children, className }: SiteHeaderProps) {
  return (
    <header className={cn("border-b bg-background/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md text-primary dark:text-cream">
          <Logo className="h-8 sm:h-9" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

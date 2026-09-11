import { LogoFull } from "@/common/assets/logo/logo-full";
import { LogoHouse } from "@/common/assets/logo/logo-house";
import { LOGO_VARIANTS, type LogoVariant } from "@/common/lib/constants/brand";
import { cn } from "@/common/lib/utils/cn.util";

type LogoProps = {
  /** `full` is the lockup with the wordmark; `house` is the mark alone. */
  kind?: "full" | "house";
  /** Color variant from the brand sheet. `auto` follows the text color. */
  variant?: LogoVariant;
  /** Accessible name; empty string for decorative use. */
  title?: string;
  className?: string;
};

/**
 * The one logo entry point. Size it with the `h-*` utility: the SVG keeps
 * its aspect ratio (3.2:1 for the lockup, 1.4:1 for the house).
 */
export function Logo({ kind = "full", variant = "auto", title, className }: LogoProps) {
  const colors = LOGO_VARIANTS[variant];
  const classes = cn("block h-8 w-auto", className);

  if (kind === "house") {
    return (
      <LogoHouse house={colors.house} circle={colors.circle} title={title} className={classes} />
    );
  }
  return (
    <LogoFull
      house={colors.house}
      circle={colors.circle}
      text={colors.text}
      title={title}
      className={classes}
    />
  );
}

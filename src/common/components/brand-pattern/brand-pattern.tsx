import { LOGO_PATHS } from "@/common/assets/logo/logo-paths";
import { cn } from "@/common/lib/utils/cn.util";

type PatternVariant = "rings" | "houses";

type BrandPatternProps = {
  variant?: PatternVariant;
  /** Tile size in px. */
  size?: number;
  className?: string;
};

function tileSvg(variant: PatternVariant): string {
  if (variant === "rings") {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><circle cx='40' cy='40' r='24' fill='none' stroke='#000' stroke-width='13'/></svg>`;
  }
  // The house mark, scaled into a tile with breathing room.
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 100'><g transform='translate(14 18) scale(0.18)'><path fill='#000' d='${LOGO_PATHS.house}'/><path fill='#000' d='${LOGO_PATHS.circle}'/></g></svg>`;
}

/**
 * Brand pattern as a masked surface: the tile is a mask and the fill is
 * `currentColor`, so the pattern takes any token color and both themes.
 * Absolutely positioned; place inside a `relative` container and set the
 * color and opacity on it (e.g. `text-cream opacity-15`).
 */
export function BrandPattern({ variant = "rings", size = 72, className }: BrandPatternProps) {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(tileSvg(variant))}")`;
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 bg-current", className)}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskRepeat: "repeat",
        WebkitMaskRepeat: "repeat",
        maskSize: `${size}px ${variant === "rings" ? size : Math.round(size * 0.83)}px`,
        WebkitMaskSize: `${size}px ${variant === "rings" ? size : Math.round(size * 0.83)}px`,
      }}
    />
  );
}

import { LOGO_PATHS } from "@/common/assets/logo/logo-paths";

export const BRAND = {
  name: "La Casa de Grado",
  shortName: "LCG",
  description:
    "Encuentra, compra y descarga las fotos de tu graduación en alta resolución.",
} as const;

/**
 * The three brand colors, fixed in both themes. Semantic tokens in
 * globals.css derive from these; use these directly only for surfaces
 * that must stay on-brand regardless of theme (footer band, logo variants).
 */
export const BRAND_COLORS = {
  teal: "#135065",
  cream: "#F1ECE8",
  amber: "#FF9E20",
  black: "#000000",
  white: "#FFFFFF",
} as const;

/**
 * Logo color variants, matching the brand sheet. `auto` follows the
 * surrounding text color and is what the app uses almost everywhere.
 */
export const LOGO_VARIANTS = {
  auto: { house: "currentColor", circle: "var(--color-amber)", text: "currentColor" },
  /** On cream: teal house and letters, amber ring. */
  teal: { house: BRAND_COLORS.teal, circle: BRAND_COLORS.amber, text: BRAND_COLORS.teal },
  /** On teal: cream house and letters, amber ring. */
  cream: { house: BRAND_COLORS.cream, circle: BRAND_COLORS.amber, text: BRAND_COLORS.cream },
  /** On amber: teal house and letters, cream ring. */
  onAmber: { house: BRAND_COLORS.teal, circle: BRAND_COLORS.cream, text: BRAND_COLORS.teal },
  monoTeal: { house: BRAND_COLORS.teal, circle: BRAND_COLORS.teal, text: BRAND_COLORS.teal },
  monoCream: { house: BRAND_COLORS.cream, circle: BRAND_COLORS.cream, text: BRAND_COLORS.cream },
  monoBlack: { house: BRAND_COLORS.black, circle: BRAND_COLORS.black, text: BRAND_COLORS.black },
  monoWhite: { house: BRAND_COLORS.white, circle: BRAND_COLORS.white, text: BRAND_COLORS.white },
} as const;

export type LogoVariant = keyof typeof LOGO_VARIANTS;

/**
 * House mark geometry for contexts without React: the sharp watermark and
 * the mask-based background patterns. Same source as the components.
 */
export const LOGO_MARK = {
  viewBox: LOGO_PATHS.viewBoxHouse,
  paths: [
    { d: LOGO_PATHS.house, kind: "fill" },
    { d: LOGO_PATHS.circle, kind: "fill" },
  ],
} as const;

export type LogoMarkPath = (typeof LOGO_MARK.paths)[number];

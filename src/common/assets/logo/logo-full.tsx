import type { SVGProps } from "react";

import { LOGO_PATHS } from "./logo-paths";

export type LogoColors = {
  /** The house shape. */
  house?: string;
  /** The ring at the corner of the roof. */
  circle?: string;
  /** The "LA CASA DE GRADO" letters. */
  text?: string;
};

type LogoFullProps = Omit<SVGProps<SVGSVGElement>, "fill"> &
  LogoColors & {
    /** Accessible name; pass an empty string when purely decorative. */
    title?: string;
  };

/**
 * Full lockup. Defaults follow the surrounding text color for house and
 * letters, with the ring in brand amber, so it adapts to light and dark
 * mode on its own. Override any part for a fixed color variant.
 */
export function LogoFull({
  house = "currentColor",
  circle = "var(--color-amber)",
  text = "currentColor",
  title = "La Casa de Grado",
  ...props
}: LogoFullProps) {
  const decorative = title === "";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_PATHS.viewBoxFull}
      fill="none"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      {...props}
    >
      {decorative ? null : <title>{title}</title>}
      <path fill={text} d={LOGO_PATHS.letters} />
      <path fill={house} d={LOGO_PATHS.house} />
      <path fill={circle} d={LOGO_PATHS.circle} />
    </svg>
  );
}

export default LogoFull;

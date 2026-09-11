import type { SVGProps } from "react";

import type { LogoColors } from "./logo-full";
import { LOGO_PATHS } from "./logo-paths";

type LogoHouseProps = Omit<SVGProps<SVGSVGElement>, "fill"> &
  Omit<LogoColors, "text"> & {
    /** Accessible name; pass an empty string when purely decorative. */
    title?: string;
  };

/** House mark only. Same color rules as the full lockup. */
export function LogoHouse({
  house = "currentColor",
  circle = "var(--color-amber)",
  title = "La Casa de Grado",
  ...props
}: LogoHouseProps) {
  const decorative = title === "";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_PATHS.viewBoxHouse}
      fill="none"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      {...props}
    >
      {decorative ? null : <title>{title}</title>}
      <path fill={house} d={LOGO_PATHS.house} />
      <path fill={circle} d={LOGO_PATHS.circle} />
    </svg>
  );
}

export default LogoHouse;

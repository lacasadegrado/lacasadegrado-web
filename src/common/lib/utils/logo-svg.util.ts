import { LOGO_PATHS } from "@/common/assets/logo/logo-paths";

/**
 * Lockup width as a share of the image's short edge. Smaller = more
 * repetitions. The linear lockup is wider than the stacked one, so 0.36
 * keeps the lettering legible while tiling densely across every face.
 */
const WATERMARK_LOCKUP_SHARE = 0.36;

/** Marker where the second line ("DE GRADO") begins in `LOGO_PATHS.letters`. */
const LINE2_MARKER = "M597.734 249.2";

type WatermarkOptions = {
  width: number;
  height: number;
};

/**
 * A full-size SVG that tiles the full logo lockup (compact house + ring
 * and single-line "LA CASA DE GRADO" letters) diagonally across the image
 * in a staggered brick layout. Everything is path data from the brand SVG,
 * never <text>: librsvg on the serverless runtime has no system fonts, so
 * text rendered as empty boxes (tofu) in production until 2026-11-25.
 *
 * Since previews have no blur (2026-10-21) this is the only protection,
 * so it is dense (crosses every face) and fairly opaque: white with a
 * dark outline, so it reads on both light and dark photographs.
 */
export function buildWatermarkSvg({ width, height }: WatermarkOptions): string {
  const splitIndex = LOGO_PATHS.letters.indexOf(LINE2_MARKER);
  const line1Letters = splitIndex >= 0 ? LOGO_PATHS.letters.slice(0, splitIndex) : LOGO_PATHS.letters;
  const line2Letters = splitIndex >= 0 ? LOGO_PATHS.letters.slice(splitIndex) : "";

  // Linear lockup geometry in path units: compact house (0..231) + "LA CASA" + "DE GRADO".
  const lockupUnitWidth = line2Letters ? 1392 : 760;
  const lockupUnitHeight = 166;
  const lockupWidth = Math.max(200, Math.round(Math.min(width, height) * WATERMARK_LOCKUP_SHARE));
  const scale = lockupWidth / lockupUnitWidth;
  const lockupHeight = Math.round(lockupUnitHeight * scale);

  // Tight spacing; the second row is shifted half a tile (brick layout),
  // so there is no clean diagonal lane to crop along.
  const tileWidth = Math.round(lockupWidth * 1.18);
  const tileHeight = Math.round(lockupHeight * 3.8);
  // Dark outline under a white fill, both opaque inside one group opacity,
  // so overlaps never stack. Width in path units, ~2.5px (half shows).
  const outline = (Math.max(2, lockupWidth / 150) / scale).toFixed(2);

  // Lockups are placed one by one in a rotated grid that covers the
  // image's diagonal, not with <pattern>: librsvg rasterizes a pattern
  // tile and then resamples it rotated, which left dotted seams.
  const reach = Math.ceil(Math.hypot(width, height) / 2) + lockupWidth;
  const positions: string[] = [];
  for (let row = -Math.ceil(reach / (tileHeight / 2)); row * (tileHeight / 2) <= reach; row += 1) {
    const shift = row % 2 === 0 ? 0 : tileWidth / 2;
    for (let col = -Math.ceil(reach / tileWidth) - 1; col * tileWidth <= reach; col += 1) {
      const x = Math.round(col * tileWidth + shift - lockupWidth / 2);
      const y = Math.round(row * (tileHeight / 2) - lockupHeight / 2);
      positions.push(`<use href="#lcg" x="${x}" y="${y}"/>`);
    }
  }
  const grid = positions.join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <g id="lcg" transform="scale(${scale.toFixed(4)})">
      <g transform="scale(0.45)">
        <path d="${LOGO_PATHS.house}"/>
        <path d="${LOGO_PATHS.circle}"/>
      </g>
      <path d="${line1Letters}" transform="translate(-290, -86.5)"/>
      ${line2Letters ? `<path d="${line2Letters}" transform="translate(233, -225.27)"/>` : ""}
    </g>
  </defs>
  <g opacity="0.55" transform="translate(${Math.round(width / 2)}, ${Math.round(height / 2)}) rotate(-30)">
    <g fill="#1A1A1A" stroke="#1A1A1A" stroke-width="${outline}" stroke-linejoin="round">${grid}</g>
    <g fill="#FFFFFF">${grid}</g>
  </g>
</svg>`;
}

import { LOGO_PATHS } from "@/common/assets/logo/logo-paths";

/**
 * Lockup width as a share of the image's short edge. Smaller = more
 * repetitions. 0.26 puts roughly 25 to 35 lockups on a 1400px preview
 * (owner asked three times for "más denso", 2026-11-25).
 */
const WATERMARK_LOCKUP_SHARE = 0.26;

type WatermarkOptions = {
  width: number;
  height: number;
};

/**
 * A full-size SVG that tiles the full logo lockup (house, ring and the
 * "LA CASA DE GRADO" letters) diagonally across the image in a staggered
 * brick layout. Everything is path data from the brand SVG, never <text>:
 * librsvg on the serverless runtime has no system fonts, so text rendered
 * as empty boxes (tofu) in production until 2026-11-25.
 *
 * Since previews have no blur (2026-10-21) this is the only protection,
 * so it is dense (crosses every face) and fairly opaque: white with a
 * dark outline, so it reads on both light and dark photographs.
 */
export function buildWatermarkSvg({ width, height }: WatermarkOptions): string {
  const [, , vw, vh] = LOGO_PATHS.viewBoxFull.split(" ").map(Number);
  const lockupWidth = Math.max(150, Math.round(Math.min(width, height) * WATERMARK_LOCKUP_SHARE));
  const scale = lockupWidth / vw;
  const lockupHeight = Math.round(vh * scale);
  // Tight spacing; the second row is shifted half a tile (brick layout),
  // so there is no clean diagonal lane to crop along.
  const tileWidth = Math.round(lockupWidth * 1.25);
  const tileHeight = Math.round(lockupHeight * 2.6);
  // Dark outline under a white fill, both opaque inside one group opacity,
  // so overlaps never stack. Width in path units, ~2.5px (half shows).
  const outline = (Math.max(2, lockupWidth / 110) / scale).toFixed(2);

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
      <path d="${LOGO_PATHS.letters}"/>
      <path d="${LOGO_PATHS.house}"/>
      <path d="${LOGO_PATHS.circle}"/>
    </g>
  </defs>
  <g opacity="0.55" transform="translate(${Math.round(width / 2)}, ${Math.round(height / 2)}) rotate(-30)">
    <g fill="#1A1A1A" stroke="#1A1A1A" stroke-width="${outline}" stroke-linejoin="round">${grid}</g>
    <g fill="#FFFFFF">${grid}</g>
  </g>
</svg>`;
}

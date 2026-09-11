import { BRAND, LOGO_MARK } from "@/common/lib/constants/brand";

/**
 * The house mark as SVG path elements, for contexts without React: the
 * sharp watermark composite. Same geometry as the <Logo /> component.
 */
export function logoMarkSvgPaths(color: string): string {
  return LOGO_MARK.paths
    .map((path) =>
      path.kind === "fill"
        ? `<path d="${path.d}" fill="${color}"/>`
        : `<path d="${path.d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
    )
    .join("");
}

type WatermarkOptions = {
  width: number;
  height: number;
};

/**
 * A full-size SVG that tiles the mark and brand name diagonally across
 * the image. Light and dark strokes are layered so it reads on both light
 * and dark photographs. Opacity is deliberate: visible, not defacing; the
 * blur underneath does the real protecting.
 */
export function buildWatermarkSvg({ width, height }: WatermarkOptions): string {
  const label = BRAND.name.toUpperCase();
  const unit = Math.max(220, Math.round(Math.min(width, height) / 2.6));
  const [vx, vy, vw, vh] = LOGO_MARK.viewBox.split(" ").map(Number);
  const markHeight = Math.round(unit * 0.16);
  const scale = markHeight / vh;
  const markWidth = Math.round(vw * scale);
  const fontSize = Math.round(unit * 0.1);
  const gap = Math.round(markHeight * 0.4);
  // Bold sans glyphs average ~0.62em wide; generous so nothing clips.
  const textWidth = Math.ceil(fontSize * 0.66 * label.length);
  const contentWidth = markWidth + gap + textWidth;
  // The tile is sized to its content, so the label never clips at the edge.
  const tileWidth = contentWidth + Math.round(unit * 0.45);
  const tileHeight = Math.round(unit * 0.75);
  const originX = Math.round(unit * 0.15);
  const originY = Math.round((tileHeight - markHeight) / 2);
  const textX = markWidth + gap;
  const textY = Math.round(markHeight * 0.78);

  const tileContent = (color: string, strokeColor: string) => `
    <g transform="translate(${originX}, ${originY})">
      <g transform="scale(${scale.toFixed(4)})" viewBox="${vx} ${vy} ${vw} ${vh}">
        ${logoMarkSvgPaths(color)}
      </g>
      <text x="${textX}" y="${textY}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}" stroke="${strokeColor}" stroke-width="${Math.max(1, Math.round(fontSize * 0.06))}" paint-order="stroke" letter-spacing="0.04em">${label}</text>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="wm" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      ${tileContent("rgba(255,255,255,0.42)", "rgba(0,0,0,0.28)")}
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wm)"/>
</svg>`;
}

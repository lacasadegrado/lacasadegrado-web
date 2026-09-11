/**
 * Renders the logo to PNG for places that cannot use SVG (email clients).
 * Output goes to public/brand and is served at /brand/<file>.
 *
 *   npm run brand:assets
 */
import { mkdirSync } from "node:fs";

import sharp from "sharp";

import { LOGO_PATHS } from "../src/common/assets/logo/logo-paths";

const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

const VARIANTS = {
  "logo-cream": { house: "#F1ECE8", circle: "#FF9E20", text: "#F1ECE8" },
  "logo-teal": { house: "#135065", circle: "#FF9E20", text: "#135065" },
} as const;

for (const [name, colors] of Object.entries(VARIANTS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_PATHS.viewBoxFull}" width="1180" height="368">
    <path fill="${colors.text}" d="${LOGO_PATHS.letters}"/>
    <path fill="${colors.house}" d="${LOGO_PATHS.house}"/>
    <path fill="${colors.circle}" d="${LOGO_PATHS.circle}"/>
  </svg>`;
  // 2x for retina at a 240px display width.
  await sharp(Buffer.from(svg)).resize({ width: 480 }).png().toFile(`${OUT}/${name}.png`);
  console.log(`ok ${OUT}/${name}.png`);
}

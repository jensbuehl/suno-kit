// Generates the extension toolbar icons from a single square master.
//
// Why a script: Chrome does NOT mask extension icons (no adaptive-icon masking
// like iOS/Android) — whatever is in the PNG is drawn as-is on any toolbar.
// So the rounded corners must be baked into the PNG with TRANSPARENT corners,
// otherwise the canvas corners show as a solid square on light/themed toolbars.
// We round + cut transparent corners here so the radius is exact and identical
// across all four sizes. Generate the master full-bleed (charcoal to the edges);
// this adds the squircle.
//
// Usage: put a square master at public/icon-master.png (≥512px, 1024 ideal),
// then run `npm run icons`.

import sharp from 'sharp';
import { existsSync } from 'node:fs';

const MASTER = 'public/icon-master.png';
const SIZES = [16, 32, 48, 128];
const RADIUS_RATIO = 0.18; // squircle-ish corner radius as a fraction of size

if (!existsSync(MASTER)) {
    console.error(`make-icons: master not found at ${MASTER}.`);
    console.error('Save your 1024×1024 icon there (full-bleed, no rounding) and re-run.');
    process.exit(1);
}

/** White rounded-rect the size of the target — used as an alpha mask (dest-in). */
function roundedMask(size) {
    const r = Math.round(size * RADIUS_RATIO);
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`;
    return Buffer.from(svg);
}

for (const size of SIZES) {
    const out = `public/icon${size}.png`;
    await sharp(MASTER)
        .resize(size, size, { fit: 'cover' })
        .composite([{ input: roundedMask(size), blend: 'dest-in' }]) // keep pixels inside the squircle
        .png()
        .toFile(out);
    console.log(`make-icons: wrote ${out}`);
}

console.log('make-icons: done. Run `npm run build` to copy them into dist/.');

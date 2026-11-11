// Image pipeline: from originals/ (or img/<name>.webp when missing) make WebP + AVIF at
// 640, 1024, 1280, 1920, 2560, 3200 px wide (never above the source width) plus the source's own width.
import sharp from "sharp";   // run:  npm i --no-save sharp && node scripts/build-images.mjs
import { existsSync, readdirSync, unlinkSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const NAMES = ["banquet", "booth", "corridor", "gate", "lawn", "stage", "welcome"];
const WIDTHS = [640, 1024, 1280, 1920, 2560, 3200];
const manifest = {};
// remove old generated variants
for (const f of readdirSync(`${ROOT}/img`)) if (/^[a-z]+-\d+\.(webp|avif)$/.test(f)) unlinkSync(`${ROOT}/img/${f}`);
for (const n of NAMES) {
  const cands = [`${ROOT}/originals/${n}.jpg`, `${ROOT}/originals/${n}.jpeg`, `${ROOT}/originals/${n}.png`, `${ROOT}/originals/${n}.webp`, `${ROOT}/img/${n}.webp`];
  const src = cands.find(existsSync);
  const meta = await sharp(src).metadata();
  const widths = [...WIDTHS.filter(w => w < meta.width), meta.width];
  manifest[n] = { source: src.replace(ROOT + "/", ""), width: meta.width, height: meta.height, aspect: +(meta.width / meta.height).toFixed(4), widths, files: {} };
  for (const w of widths) {
    for (const fmt of ["webp", "avif"]) {
      const out = `${ROOT}/img/${n}-${w}.${fmt}`;
      const pipe = sharp(src).resize({ width: w, withoutEnlargement: true });
      if (fmt === "webp") await pipe.webp({ quality: 80, effort: 5 }).toFile(out);
      else await pipe.avif({ quality: 62, effort: 6 }).toFile(out);   // sharp AVIF q62 ≈ WebP q80 visually, at fewer bytes; q80 AVIF came out larger than the WebP
      manifest[n].files[`${w}.${fmt}`] = statSync(out).size;
    }
  }
  console.log(n.padEnd(9), `${meta.width}x${meta.height}`, "→", widths.join("/"), "| webp", widths.map(w => Math.round(manifest[n].files[`${w}.webp`] / 1024) + "K").join(" "), "| avif", widths.map(w => Math.round(manifest[n].files[`${w}.avif`] / 1024) + "K").join(" "));
}
writeFileSync(`${ROOT}/img/manifest.json`, JSON.stringify(manifest, null, 2));

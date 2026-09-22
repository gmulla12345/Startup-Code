// maplibre-gl 6's Web Worker can't be resolved by webpack's bundler (see the
// comment in src/components/map/discovery-map.tsx for the full story), so
// its two runtime files are served as plain static assets instead. This
// script copies them from whatever maplibre-gl version is actually
// installed into public/maplibre/ -- run automatically via "postinstall" so
// it can't silently drift out of sync with a future maplibre-gl bump.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const destDir = path.join(__dirname, "..", "public", "maplibre");

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

fs.mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = path.join(srcDir, file);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-maplibre-worker] ${file} not found in maplibre-gl/dist -- skipping (map tiles may not render)`);
    continue;
  }
  fs.copyFileSync(src, path.join(destDir, file));
}

console.log("[copy-maplibre-worker] copied maplibre-gl worker files to public/maplibre/");

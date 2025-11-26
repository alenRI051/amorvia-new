// tools/scan-backgrounds.mjs
// Scan /public/assets/backgrounds for SVGs, cross-check usage in *.v2.json,
// write /public/data/backgrounds.v1.json, and list unused backgrounds.

import { promises as fs } from "fs";
import path from "path";
import url from "url";

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const BACKGROUNDS_DIR = path.join(ROOT, "public", "assets", "backgrounds");
const DATA_DIR = path.join(ROOT, "public", "data");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  console.log("=== Amorvia background scan ===");

  // 1) Collect all *.svg in backgrounds folder
  const allFiles = await fs.readdir(BACKGROUNDS_DIR);
  const svgFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".svg"));
  if (!svgFiles.length) {
    console.warn("No SVG backgrounds found in", BACKGROUNDS_DIR);
    return;
  }

  // 2) Find which ones are referenced in *.v2.json (ui.backgrounds)
  const used = new Set();

  const dataFiles = await fs.readdir(DATA_DIR);
  const v2Files = dataFiles.filter((f) => f.endsWith(".v2.json"));

  for (const fname of v2Files) {
    const full = path.join(DATA_DIR, fname);
    let json;
    try {
      json = await readJson(full);
    } catch (e) {
      console.warn("⚠️  Skipping invalid JSON:", fname, e.message);
      continue;
    }

    const ui = json && json.ui;
    const bg = ui && ui.backgrounds;
    if (!bg) continue;

    const collect = (value) => {
      if (typeof value === "string") {
        const base = path.basename(value);
        used.add(base);
      }
    };

    if (bg.default) collect(bg.default);
    if (bg.act && typeof bg.act === "object") {
      Object.values(bg.act).forEach(collect);
    }
  }

  // 3) Build index structure
  const now = new Date().toISOString();
  const backgrounds = svgFiles.map((file) => {
    const id = file.replace(/\.svg$/i, "");
    const label = id
      .replace(/[_\-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id,
      label,
      src: `/assets/backgrounds/${file}`,
      used: used.has(file),
    };
  });

  const out = {
    version: 1,
    generatedAt: now,
    backgrounds,
  };

  const outPath = path.join(DATA_DIR, "backgrounds.v1.json");
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("✓ Wrote background index:", path.relative(ROOT, outPath));

  // 4) Log unused ones so you can delete them manually
  const unused = backgrounds.filter((b) => !b.used);
  if (unused.length) {
    console.log("\nUnused backgrounds (safe to consider deleting):");
    unused.forEach((b) => console.log(" -", b.src));
  } else {
    console.log("\nNo unused backgrounds detected 🎉");
  }

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Background scan failed:", err);
  process.exitCode = 1;
});

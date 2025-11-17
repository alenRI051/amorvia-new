// tools/check-data-integrity.mjs
import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, "..");
const dataDir = path.join(repoRoot, "public", "data");
const v2IndexPath = path.join(dataDir, "v2-index.json");

function fail(msg) {
  console.error(`❌ DATA INTEGRITY ERROR: ${msg}`);
}

// --- 1. Load v2-index.json and collect allowed scenario paths ---
if (!fs.existsSync(v2IndexPath)) {
  console.error("⚠️ v2-index.json not found; skipping data integrity check.");
  process.exit(0); // do not block commit if index is missing
}

const indexRaw = fs.readFileSync(v2IndexPath, "utf8");
let indexJson;
try {
  indexJson = JSON.parse(indexRaw);
} catch (e) {
  console.error("❌ Failed to parse v2-index.json:", e.message);
  process.exit(1);
}

const scenarios = Array.isArray(indexJson.scenarios) ? indexJson.scenarios : [];
const allowedScenarioFiles = new Set(
  scenarios
    .map((s) => s.path)
    .filter(Boolean)
    .map((p) => path.join("public", p.replace(/^[./]*/, ""))) // "data/..." -> "public/data/..."
);

// Always allow the index itself
allowedScenarioFiles.add(path.join("public", "data", "v2-index.json"));

// --- 2. Allowed non-scenario JSON files (current UI helpers) ---
const allowedNonScenarioJson = new Set([
  "art-index.json",
  "brzi-kontakti.json",
  "co-parenting-with-bipolar-partner.json",
  "dating-after-breakup-with-child-involved.json",
  "scene-de-escalation.json",
  "scene-different-rules.json",
  "scene-first-agreements.json",
  "scene-new-introductions.json",
  "direction.json",
  "to-do.json",
]);

// --- 3. Walk public/data and collect files ---
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(dataDir);

// --- 4. Validate files ---
let hasErrors = false;

for (const fullPath of allFiles) {
  const relFromRepo = path.relative(repoRoot, fullPath);
  const base = path.basename(fullPath);

  // 4a. No .bak files allowed
  if (base.endsWith(".bak")) {
    fail(`Backup file found in public/data: ${relFromRepo}`);
    hasErrors = true;
    continue;
  }

  // Only care about JSON-ish things
  if (!base.endsWith(".json")) continue;

  const isV2Scenario = base.endsWith(".v2.json");

  if (isV2Scenario) {
    // Must be in v2-index (or be v2-index itself, already allowed)
    if (!allowedScenarioFiles.has(relFromRepo)) {
      fail(
        `v2 scenario JSON is not declared in v2-index.json: ${relFromRepo}`
      );
      hasErrors = true;
    }
  } else {
    // Plain .json (non-v2)
    if (base === "v2-index.json") {
      // already whitelisted above
      continue;
    }
    if (!allowedNonScenarioJson.has(base)) {
      fail(
        `Unexpected JSON file in public/data (not whitelisted helper and not a .v2.json): ${relFromRepo}`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error(
    "\n💥 Data integrity issues detected in public/data.\n" +
      "   - Only *.v2.json from v2-index are allowed as scenarios.\n" +
      "   - Only known helper JSON files are allowed as non-scenario.\n" +
      "   - No *.bak files are allowed.\n"
  );
  process.exit(1);
} else {
  console.log("✅ public/data integrity OK.");
}

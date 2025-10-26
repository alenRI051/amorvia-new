// tools/convert-to-v2.mjs
// Usage: node tools/convert-to-v2.mjs --pattern=public/data/*.v2.json --write

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import glob from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split("=");
    return [k.replace(/^--/, ""), v ?? true];
  })
);

const pattern = args.pattern || "public/data/*.v2.json";
const doWrite = !!args.write;

function pickFirst(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.length) return v;
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function harmonizeChoice(c) {
  const cc = { ...c };
  cc.label = pickFirst(cc.label, cc.text, cc.title, cc.caption, "Continue");
  cc.text = pickFirst(cc.text, cc.label, "");
  if (cc.effects && typeof cc.effects === "object" && !cc.effects.meters) {
    const { trust, tension, childStress } = cc.effects;
    if (
      typeof trust !== "undefined" ||
      typeof tension !== "undefined" ||
      typeof childStress !== "undefined"
    ) {
      cc.effects = {
        ...cc.effects,
        meters: {
          trust: trust ?? 0,
          tension: tension ?? 0,
          childStress: childStress ?? 0,
        },
      };
    }
  }
  // Normalize jump key
  cc.next = pickFirst(cc.next, cc.to, cc.target, cc.then, null);
  return cc;
}

function harmonizeNode(n) {
  if (!n || typeof n !== "object") return n;
  const node = { ...n };
  node.speaker = node.speaker || "Narrator";
  node.text =
    pickFirst(node.text, node.content, node.line) ??
    (Array.isArray(node.lines) ? node.lines.join("\n") : "");
  if (Array.isArray(node.choices)) node.choices = node.choices.map(harmonizeChoice);
  return node;
}

function processScenario(json) {
  const scn = { ...json };

  // Harmonize nodes
  if (Array.isArray(scn.nodes)) scn.nodes = scn.nodes.map(harmonizeNode);

  // Harmonize steps that are objects (keep string ids as-is)
  if (Array.isArray(scn.acts)) {
    scn.acts = scn.acts.map((act) => {
      if (!act || !Array.isArray(act.steps)) return act;
      return {
        ...act,
        steps: act.steps.map((s) => (typeof s === "string" ? s : harmonizeNode(s))),
      };
    });
  }

  // Ensure entry pointer exists
  scn.entry = scn.entry || scn.entryNodeId || scn.start || scn.startNodeId;
  if (!scn.entry) {
    let candidate = null;
    const act1 = scn.acts?.find((a) => /^act1$/i.test(a?.id || ""));
    if (act1?.steps?.length) {
      const first = act1.steps[0];
      candidate = typeof first === "string" ? first : first?.id;
    } else if (Array.isArray(scn.nodes) && scn.nodes[0]?.id) {
      candidate = scn.nodes[0].id;
    }
    scn.entry = candidate || "a1s1";
  }
  scn.entryNodeId = scn.entry;
  scn.start = scn.entry;
  scn.startNodeId = scn.entry;

  // HUD defaults
  scn.meters = scn.meters || { trust: 0, tension: 0, childStress: 0 };
  scn.meterOrder = scn.meterOrder || ["trust", "tension", "childStress"];
  scn.ui = scn.ui || { hud: { animate: true, animated: true }, dialog: { defaultSpeaker: "Narrator" } };
  scn.ui.hud = scn.ui.hud || { animate: true, animated: true };
  if (typeof scn.ui.hud.animate === "undefined") scn.ui.hud.animate = true;
  scn.ui.hud.animated = true;
  scn.ui.dialog = scn.ui.dialog || { defaultSpeaker: "Narrator" };

  return scn;
}

/* --------- Main --------- */
const files = glob.sync(pattern, { cwd: path.resolve(__dirname, "..") }).map((p) =>
  path.resolve(path.resolve(__dirname, ".."), p)
);

let updated = 0;
for (const f of files) {
  try {
    const raw = JSON.parse(fs.readFileSync(f, "utf8"));
    const out = processScenario(raw);
    if (doWrite) {
      fs.writeFileSync(f, JSON.stringify(out, null, 2) + "\n", "utf8");
      console.log(`[convert-to-v2] Updated ${path.relative(path.resolve(__dirname, ".."), f)}`);
      updated++;
    }
  } catch (e) {
    console.error(`[convert-to-v2] Error in ${f}:`, e.message);
  }
}
if (doWrite) console.log(`[convert-to-v2] Completed. ${updated} file(s) updated.`);


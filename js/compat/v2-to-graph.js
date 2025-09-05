// js/compat/v2-to-graph.js
// Converts simple v2 "acts/steps" into a linear graph aXsY -> aXs(Y+1)
export function v2ToGraph(v2) {
  if (!v2 || !Array.isArray(v2.acts)) {
    throw new Error("v2ToGraph: invalid v2 payload (missing acts)");
  }

  const nodes = {};
  let startId = null;

  // normalize meters -> {name: number}
  const meters = {};
  if (v2.meters && typeof v2.meters === "object") {
    for (const [key, def] of Object.entries(v2.meters)) {
      const val =
        typeof def === "number" ? def :
        (def && typeof def.start === "number" ? def.start : 0);
      meters[key] = clamp(val, 0, 100);
    }
  }

  v2.acts.forEach((act, ai) => {
    const a = ai + 1;
    const steps = Array.isArray(act.steps) ? act.steps : [];
    steps.forEach((text, si) => {
      const s = si + 1;
      const id = `a${a}s${s}`;
      if (!startId) startId = id;

      const next =
        (si + 1 < steps.length) ? `a${a}s${s + 1}` :
        (ai + 1 < v2.acts.length) ? `a${a + 1}s1` :
        null;

      nodes[id] = next
        ? { id, text: String(text), next }
        : { id, text: String(text), type: "end" };
    });
  });

  return {
    title: v2.title || v2.id || "Scenario",
    startId: startId || "a1s1",
    nodes,
    meters
  };
}

function clamp(n, lo, hi) {
  n = Number(n);
  if (!Number.isFinite(n)) n = 0;
  return Math.max(lo, Math.min(hi, n));
}

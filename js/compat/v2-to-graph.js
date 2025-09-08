// Converts v2 "acts/steps" into a graph { startId, nodes, meters }
// Supports steps as strings or objects with `text` and optional `choices`.
// Each choice can have: label, to|goto|next ("next"|"end"|<nodeId>), effects|delta.
export function v2ToGraph(v2) {
  if (!v2 || !Array.isArray(v2.acts)) {
    throw new Error("v2ToGraph: invalid v2 payload (missing acts)");
  }

  const nodes = {};
  let startId = null;

  // meters -> plain number map
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
    steps.forEach((step, si) => {
      const s = si + 1;
      const id = `a${a}s${s}`;
      if (!startId) startId = id;

      const nextId =
        (si + 1 < steps.length) ? `a${a}s${s + 1}` :
        (ai + 1 < v2.acts.length) ? `a${a + 1}s1` :
        null;

      if (typeof step === "string") {
        nodes[id] = nextId
          ? { id, text: step, next: nextId }
          : { id, text: step, type: "end" };
      } else if (step && typeof step === "object") {
        const text = String(step.text ?? "");
        const choicesSrc = Array.isArray(step.choices) ? step.choices : null;

        if (choicesSrc && choicesSrc.length) {
          const choices = choicesSrc.map((ch, idx) => {
            const label = String(ch.label ?? ch.title ?? `Option ${idx + 1}`);
            const effects = ch.effects ?? ch.delta ?? ch.impact ?? null;
            let to = ch.to ?? ch.goto ?? ch.next ?? null;
            if (to === true || to === "next") to = nextId || null;
            if (to === "end") to = null;
            if (!to && nextId) to = nextId;
            return { label, to, effects };
          });
          const allNull = choices.every(c => !c.to);
          nodes[id] = (allNull && !nextId)
            ? { id, text, type: "end", choices }
            : { id, text, choices };
        } else {
          nodes[id] = nextId
            ? { id, text, next: nextId }
            : { id, text, type: "end" };
        }
      } else {
        nodes[id] = nextId
          ? { id, text: "", next: nextId }
          : { id, text: "", type: "end" };
      }
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


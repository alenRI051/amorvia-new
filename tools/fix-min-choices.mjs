#!/usr/bin/env node
import fs from 'fs';

const file = 'public/data/co-parenting-with-bipolar-partner.v2.json';
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);

function toEffectsObject(effects) {
  if (!effects) return {};
  if (Array.isArray(effects)) {
    const out = {};
    for (const e of effects) {
      if (!e || typeof e !== 'object') continue;
      const m = e.meter;
      const d = Number(e.delta);
      if (typeof m === 'string' && Number.isFinite(d)) {
        out[m] = (out[m] ?? 0) + d;
      }
    }
    return out;
  }
  return typeof effects === 'object' ? effects : {};
}

if (Array.isArray(data?.acts)) {
  data.acts.forEach((act, aIdx) => {
    if (Array.isArray(act?.nodes)) {
      act.nodes = act.nodes.map((node, nIdx) => {
        const step = { ...node };
        const stepId = step.id || `a${aIdx+1}n${nIdx+1}`;

        // normalize existing choices if present
        if (!Array.isArray(step.choices)) step.choices = [];

        step.choices = step.choices.map((c, i) => {
          const cc = { ...(c || {}) };
          // unify field names to v2 choice shape
          if (cc.text && !cc.label) cc.label = cc.text;
          delete cc.text;
          if (cc.next !== undefined && cc.to === undefined) cc.to = cc.next;
          delete cc.next;
          cc.effects = toEffectsObject(cc.effects);
          if (cc.to === null || cc.to === undefined || typeof cc.to !== 'string') cc.to = 'menu';
          if (!cc.id) cc.id = `${stepId}c${i+1}`;
          if (!cc.label) cc.label = 'Continue';
          if (!cc.tone) cc.tone = 'neutral';
          return cc;
        });

        // ensure at least two choices
        while (step.choices.length < 2) {
          step.choices.push({
            id: `${stepId}c${step.choices.length+1}`,
            label: step.choices.length === 0 ? 'Continue' : 'Return to menu',
            tone: 'neutral',
            effects: {},
            to: 'menu'
          });
        }
        return step;
      });
    }
  });
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('[fix-min-choices] Updated', file);

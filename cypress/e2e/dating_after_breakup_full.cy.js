/// <reference types="cypress" />

// --- Adjustable test constraints ---
const ALLOWED_METERS = new Set(['trust', 'tension', 'childStress']);
const MAX_ABS_DELTA_PER_CHOICE = 2; // "e.g., trust ±2 per choice"
const ALLOW_NULL_NEXT = true;       // allow "return to menu" exits with next:null

// Optionally verify a runtime clamp if your app exposes it (non-fatal check)
const RUNTIME_CLAMP_CHECK = {
  enabled: false,            // set to true if your app has window.Amorvia.config.meterClamp
  expectedMin: -10,
  expectedMax: 10,
};

/**
 * Build fast lookup maps for acts and steps.
 * @param {object} scenario
 * @returns {{actMap: Map<string,object>, stepMap: Map<string,object>, stepToAct: Map<string,string>}}
 */
function indexScenario(scenario) {
  const actMap = new Map();
  const stepMap = new Map();
  const stepToAct = new Map();

  (scenario.acts || []).forEach((act) => {
    actMap.set(act.id, act);
    (act.steps || []).forEach((step) => {
      stepMap.set(step.id, step);
      stepToAct.set(step.id, act.id);
    });
  });

  return { actMap, stepMap, stepToAct };
}

/**
 * Validate a "next" pointer.
 * Accepts:
 *  - step id present anywhere in scenario
 *  - act id present (engine can interpret as "jump to act start")
 *  - null (menu exit), if allowed
 */
function isValidNextPointer(next, actMap, stepMap) {
  if (next == null) return ALLOW_NULL_NEXT;
  if (typeof next !== 'string') return false;
  return stepMap.has(next) || actMap.has(next);
}

/**
 * Validate effects array for a choice.
 */
function validateEffects(effects) {
  if (!Array.isArray(effects)) return { ok: false, reason: 'effects must be an array' };
  for (const e of effects) {
    if (!e || typeof e !== 'object') return { ok: false, reason: 'effect item must be an object' };
    if (!ALLOWED_METERS.has(e.meter)) {
      return { ok: false, reason: `illegal meter "${e.meter}"` };
    }
    const d = e.delta;
    if (typeof d !== 'number' || !Number.isFinite(d)) {
      return { ok: false, reason: 'delta must be a finite number' };
    }
    if (Math.abs(d) > MAX_ABS_DELTA_PER_CHOICE) {
      return { ok: false, reason: `delta out of bounds: ${d}` };
    }
  }
  return { ok: true };
}

describe('Dating After Breakup scenario: full data validation (Acts 1–4)', () => {
  let scenario;
  let actMap, stepMap;

  before(() => {
    // Cypress returns an OBJECT for .json files. No JSON.parse needed.
    cy.readFile('public/data/dating-after-breakup-with-child-involved.v2.json')
        .then((data) => {
          scenario = typeof data === 'string' ? JSON.parse(data) : data;
          const idx = indexScenario(scenario);
          actMap = idx.actMap;
          stepMap = idx.stepMap;
      });
  });
    
  it('has required top-level fields and version 1.3.0', () => {
    expect(scenario).to.have.property('id', 'dating-after-breakup-with-child-involved');
    expect(scenario).to.have.property('title').and.to.be.a('string').and.not.be.empty;
    expect(scenario).to.have.property('version', '1.3.0');
    expect(scenario).to.have.property('meters').and.to.be.an('array');
    // Check meter set matches expectations (array compare to avoid Set pitfalls)
    const metersSorted = [...scenario.meters].sort();
    const expectedSorted = [...ALLOWED_METERS].sort();
    expect(metersSorted).to.deep.eq(expectedSorted);
    // Acts exist and include 1..4
    expect(scenario).to.have.property('acts').and.to.be.an('array').and.not.be.empty;
    const actIds = scenario.acts.map(a => a.id);
    ['act1', 'act2', 'act3', 'act4'].forEach(id => expect(actIds, `missing ${id}`).to.include(id));
  });

  it('each act has steps and each step has valid choices', () => {
    scenario.acts.forEach((act) => {
      expect(act).to.have.property('id').that.is.a('string').and.not.empty;
      expect(act).to.have.property('steps').that.is.an('array').and.not.empty;

      act.steps.forEach((step) => {
        expect(step).to.have.property('id').that.is.a('string').and.not.empty;
        expect(step).to.have.property('text').that.is.a('string').and.not.empty;

        // Steps can be summaries with choices (as in this scenario). If you add truly terminal steps, relax this.
        expect(step).to.have.property('choices').that.is.an('array').and.not.empty;

        step.choices.forEach((choice) => {
          expect(choice).to.have.property('id').that.is.a('string').and.not.empty;
          expect(choice).to.have.property('text').that.is.a('string').and.not.empty;

          // Effects: array of {meter, delta} within allowed bounds
          if (choice.effects) {
            const res = validateEffects(choice.effects);
            expect(res.ok, `effects invalid on ${step.id}/${choice.id}: ${res.reason || 'unknown'}`).to.be.true;
          } else {
            // Neutral choices should still have an effects array (even if all zeros) for consistency
            // If your engine allows missing effects, change to "warn" instead of "fail":
            // cy.log(`WARN: ${step.id}/${choice.id} has no effects array`);
            expect(choice).to.have.property('effects').that.is.an('array');
          }

          // next: must resolve to a step id, an act id, or (optionally) null
          expect(
            isValidNextPointer(choice.next, actMap, stepMap),
            `Broken "next" pointer "${choice.next}" on ${step.id}/${choice.id}`
          ).to.be.true;
        });
      });
    });
  });

  it('all "next" pointers are resolvable to an existing step or act id (or null)', () => {
    scenario.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          const n = choice.next;
          expect(
            isValidNextPointer(n, actMap, stepMap),
            `Unresolvable next="${n}" from ${step.id}/${choice.id}`
          ).to.be.true;
        });
      });
    });
  });

  it('no choice effect uses an unknown meter or out-of-range delta', () => {
    let bad = [];
    scenario.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          const res = validateEffects(choice.effects || []);
          if (!res.ok) {
            bad.push({ step: step.id, choice: choice.id, reason: res.reason });
          }
        });
      });
    });
    if (bad.length) {
      throw new Error('Invalid effects found:\n' + bad.map(b => `${b.step}/${b.choice}: ${b.reason}`).join('\n'));
    }
  });

  // Optional: quick sanity traversal to ensure there are no orphan steps (weak check)
  it('every step is either the first step of its act or referenced by at least one choice', () => {
    // Build a reverse index: target -> [fromStep/choice]
    const inbound = new Map();
    scenario.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          if (choice.next && stepMap.has(choice.next)) {
            if (!inbound.has(choice.next)) inbound.set(choice.next, []);
            inbound.get(choice.next).push(`${step.id}/${choice.id}`);
          }
        });
      });
    });

    scenario.acts.forEach((act) => {
      const firstStepId = act.steps[0]?.id;
      act.steps.forEach((step, idx) => {
        const refs = inbound.get(step.id) || [];
        const isFirst = step.id === firstStepId;
        // Allow first step to have zero inbound
        if (!isFirst) {
          expect(refs.length, `Step ${step.id} in ${act.id} has no inbound references`).to.be.greaterThan(0);
        }
      });
    });
  });
});

// Optional runtime clamp verification (non-fatal placeholder).
// Enable RUNTIME_CLAMP_CHECK.enabled and set baseUrl to your app (e.g. http://localhost:5173 or vercel preview).
// This checks window.Amorvia?.config.meterClamp exists and matches expected range.
if (RUNTIME_CLAMP_CHECK.enabled) {
  describe('Amorvia runtime meter clamp (optional)', () => {
    it('exposes meter clamp config within expected bounds', () => {
      cy.visit('/');
      cy.window().then((win) => {
        const clamp = win.Amorvia?.config?.meterClamp;
        expect(clamp, 'window.Amorvia.config.meterClamp present').to.exist;
        expect(clamp.min).to.eq(RUNTIME_CLAMP_CHECK.expectedMin);
        expect(clamp.max).to.eq(RUNTIME_CLAMP_CHECK.expectedMax);
      });
    });
  });
}

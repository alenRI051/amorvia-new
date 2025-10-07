/// <reference types="cypress" />

const SCENARIO_PATH = 'public/data/dating-after-breakup-with-child-involved.v2.json';
const SAFE_METERS = ['trust', 'tension', 'childStress'];
const SAFE_RANGE = { min: -2, max: 2 };
const isSafeDelta = (n) => Number.isFinite(n) && n >= SAFE_RANGE.min && n <= SAFE_RANGE.max;

describe('Dating After Breakup scenario: full data validation (Acts 1–4)', () => {
  let data;
  let stepIds = new Set();
  let actIds = new Set();
  let firstStepByAct = new Map();

  before(() => {
    // Cypress readFile auto-parses .json → returns an object
    cy.readFile(SCENARIO_PATH).then((json) => {
      data = json;

      // collect ids
      (data.acts || []).forEach((act) => {
        actIds.add(act.id);
        const first = act.steps?.[0]?.id;
        if (first) firstStepByAct.set(act.id, first);
        (act.steps || []).forEach((s) => stepIds.add(s.id));
      });
    });
  });

  it('has required top-level fields and version 2', () => {
    expect(data).to.have.property('id').that.is.a('string');
    expect(data).to.have.property('title').that.is.a('string');
    expect(data).to.have.property('version', 2);
    expect(data).to.have.property('meters').that.is.an('object');
    SAFE_METERS.forEach((m) => expect(data.meters).to.have.property(m));
    expect(data).to.have.property('acts').that.is.an('array').and.not.empty;
  });

  it('each act has steps and each step has valid choices', () => {
    data.acts.forEach((act) => {
      expect(act).to.have.property('steps').that.is.an('array').and.not.empty;
      act.steps.forEach((step) => {
        expect(step).to.have.property('id').that.is.a('string');
        expect(step).to.have.property('text').that.is.a('string');
        expect(step).to.have.property('choices').that.is.an('array');
        expect(step.choices.length).to.be.gte(2);

        step.choices.forEach((choice) => {
          expect(choice).to.have.property('id').that.is.a('string');
          expect(choice).to.have.property('label').that.is.a('string');
          expect(choice).to.have.property('to');
          expect(choice.to === 'menu' || typeof choice.to === 'string').to.eq(true);
          expect(choice).to.have.property('effects').that.is.an('object'); // v2
        });
      });
    });
  });

  it('all "to" pointers are resolvable to an existing step or act id (or "menu")', () => {
    const validTargets = new Set(['menu', ...stepIds, ...actIds]);

    const badTargets = [];
    data.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          if (!validTargets.has(choice.to)) {
            badTargets.push(`${step.id}/${choice.id}: to="${choice.to}"`);
          }
        });
      });
    });

    if (badTargets.length) {
      throw new Error(`Unresolvable targets:\n${badTargets.join('\n')}`);
    }
  });

  it('no choice effect uses an unknown meter or out-of-range delta', () => {
    const invalids = [];

    data.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          const eff = choice.effects || {};
          Object.keys(eff).forEach((k) => {
            if (!SAFE_METERS.includes(k)) {
              invalids.push(`${step.id}/${choice.id}: unknown meter "${k}"`);
            } else if (!isSafeDelta(eff[k])) {
              invalids.push(`${step.id}/${choice.id}: ${k} delta ${eff[k]} out of ${SAFE_RANGE.min}..${SAFE_RANGE.max}`);
            }
          });
        });
      });
    });

    if (invalids.length) {
      throw new Error(`Invalid effects found:\n${invalids.join('\n')}`);
    }
  });

  it('every step is either the first step of its act or referenced by at least one choice', () => {
    const inbound = new Map(Array.from(stepIds).map((id) => [id, 0]));

    data.acts.forEach((act) => {
      act.steps.forEach((step) => {
        step.choices.forEach((choice) => {
          if (stepIds.has(choice.to)) {
            inbound.set(choice.to, (inbound.get(choice.to) || 0) + 1);
          }
        });
      });
    });

    const problems = [];
    data.acts.forEach((act) => {
      const firstId = firstStepByAct.get(act.id);
      act.steps.forEach((step) => {
        if (step.id === firstId) return; // first step can have 0 inbound
        if ((inbound.get(step.id) || 0) === 0) {
          problems.push(`Step ${step.id} in ${act.id} has no inbound references`);
        }
      });
    });

    if (problems.length) {
      throw new Error(problems.join('\n'));
    }
  });

  it('random playthroughs keep cumulative meters within clamps', () => {
    const CLAMP = { min: -10, max: 10 }; // tune as needed
    const runs = 50; // number of random walks

    const clamp = (v) => Math.max(CLAMP.min, Math.min(CLAMP.max, v));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (let r = 0; r < runs; r++) {
      const totals = { trust: 0, tension: 0, childStress: 0 };

      // start at first act/first step
      let act = data.acts[0];
      let step = act.steps[0];
      let hops = 0;

      while (hops < 200 && step) {
        const choice = pick(step.choices);
        const eff = choice.effects || {};

        // apply deltas with clamp
        Object.keys(totals).forEach((m) => {
          totals[m] = clamp(totals[m] + (eff[m] || 0));
          expect(totals[m]).to.be.within(CLAMP.min, CLAMP.max);
        });

        // resolve next
        if (choice.to === 'menu') break; // terminal
        const to = choice.to;

        // act jump?
        const nextAct = data.acts.find((a) => a.id === to);
        if (nextAct) {
          act = nextAct;
          step = act.steps[0];
        } else {
          // step jump across acts (IDs are globally unique)
          let found = null;
          for (const a of data.acts) {
            found = a.steps.find((s) => s.id === to);
            if (found) break;
          }
          step = found || null;
        }
        hops++;
      }
    }
  });
});

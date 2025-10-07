/// <reference types="cypress" />

// Repo-wide smoke for all v2 scenarios (supports acts.steps as array OR object map)
const SAFE_RANGE = { min: -2, max: 2 };
const isSafeDelta = (n) => Number.isFinite(n) && n >= SAFE_RANGE.min && n <= SAFE_RANGE.max;

// Normalize act.steps to an array of {id, ...step}
function normalizeSteps(steps) {
  if (Array.isArray(steps)) {
    const ids = new Set();
    steps.forEach((s) => { if (s && s.id) ids.add(s.id); });
    return { list: steps, ids };
  }
  const list = [];
  const ids = new Set();
  if (steps && typeof steps === 'object') {
    Object.entries(steps).forEach(([key, val]) => {
      const id = (val && typeof val === 'object' && typeof val.id === 'string') ? val.id : String(key);
      list.push({ id, ...(val || {}) });
      ids.add(id);
    });
  }
  return { list, ids };
}

// Determine if a step has some human-readable display text
const DISPLAY_KEYS = ['text', 'label', 'prompt', 'title', 'description', 'desc'];
function hasDisplayText(step) {
  return DISPLAY_KEYS.some((k) => typeof step[k] === 'string' && step[k].trim().length > 0);
}

describe('Amorvia: repo-wide scenario smoke checks (v2 schema)', () => {
  it('validates every public/data/*.v2.json', () => {
    cy.exec('ls -1 public/data/*.v2.json').then(({ stdout }) => {
      const files = stdout.trim().split('\n').filter(Boolean);
      expect(files.length, 'at least one v2 scenario present').to.be.greaterThan(0);

      files.forEach((path) => {
        cy.readFile(path).then((data) => {
          // --- Top-level checks
          expect(data, `${path} top-level`).to.have.property('id').that.is.a('string');
          expect(data, `${path} top-level`).to.have.property('title').that.is.a('string');
          expect(data, `${path} version`).to.have.property('version', 2);
          expect(data, `${path} meters`).to.have.property('meters').that.is.an('object');
          const knownMeters = Object.keys(data.meters || {});
          expect(knownMeters.length, `${path} meters non-empty`).to.be.greaterThan(0);
          expect(data, `${path} acts`).to.have.property('acts').that.is.an('array').and.not.empty;

          // --- Collect ids + first steps (after normalization)
          const actIds = new Set();
          const allStepIds = new Set();
          const firstStepByAct = new Map();
          const stepsByAct = new Map(); // actId -> normalized list

          (data.acts || []).forEach((act) => {
            expect(act, `${path} act`).to.have.property('id').that.is.a('string');
            expect(act, `${path} act`).to.have.property('title').that.is.a('string');
            expect(act, `${path} act steps`).to.have.property('steps');

            actIds.add(act.id);

            const { list, ids } = normalizeSteps(act.steps);
            expect(list, `${path} ${act.id} normalized steps array`).to.be.an('array').and.not.empty;

            stepsByAct.set(act.id, list);

            const firstId = list?.[0]?.id;
            if (firstId) firstStepByAct.set(act.id, firstId);

            ids.forEach((id) => allStepIds.add(id));
          });

          // --- Step + choice shape
          data.acts.forEach((act) => {
            const list = stepsByAct.get(act.id) || [];
            list.forEach((step) => {
              expect(step, `${path} step`).to.have.property('id').that.is.a('string');

              // Accept text-like fields across scenarios
              expect(
                hasDisplayText(step),
                `${path} step ${step.id} needs a display text field (one of ${DISPLAY_KEYS.join(', ')})`
              ).to.eq(true);

              expect(step, `${path} step choices`).to.have.property('choices').that.is.an('array');
              expect(step.choices.length, `${path} ${step.id} choices >=2`).to.be.gte(2);

              step.choices.forEach((choice) => {
                expect(choice, `${path} ${step.id} choice`).to.have.property('id').that.is.a('string');
                expect(choice, `${path} ${step.id} choice label`).to.have.property('label').that.is.a('string');
                expect(choice, `${path} ${step.id} choice to`).to.have.property('to');
                expect(choice.to === 'menu' || typeof choice.to === 'string', `${path} ${step.id}/${choice.id} to type`).to.eq(true);
                expect(choice, `${path} ${step.id} choice effects`).to.have.property('effects').that.is.an('object');
              });
            });
          });

          // --- Resolve "to" targets
          const validTargets = new Set(['menu', ...Array.from(allStepIds), ...Array.from(actIds)]);
          const badTargets = [];
          data.acts.forEach((act) => {
            const list = stepsByAct.get(act.id) || [];
            list.forEach((step) => {
              step.choices.forEach((choice) => {
                if (!validTargets.has(choice.to)) {
                  badTargets.push(`${path}: ${step.id}/${choice.id} → "${choice.to}"`);
                }
              });
            });
          });
          expect(badTargets, `${path} unresolvable to-targets`).to.deep.eq([]);

          // --- Effects constraints (known meters + ±2 range)
          const invalidEffects = [];
          data.acts.forEach((act) => {
            const list = stepsByAct.get(act.id) || [];
            list.forEach((step) => {
              step.choices.forEach((choice) => {
                const eff = choice.effects || {};
                Object.entries(eff).forEach(([k, v]) => {
                  if (!knownMeters.includes(k)) {
                    invalidEffects.push(`${path}: ${step.id}/${choice.id} unknown meter "${k}"`);
                  } else if (!isSafeDelta(v)) {
                    invalidEffects.push(`${path}: ${step.id}/${choice.id} ${k} delta ${v} out of ${SAFE_RANGE.min}..${SAFE_RANGE.max}`);
                  }
                });
              });
            });
          });
          expect(invalidEffects, `${path} invalid effects`).to.deep.eq([]);

          // --- Reachability: every non-first step must have at least one inbound
          const inbound = new Map(Array.from(allStepIds).map((id) => [id, 0]));
          data.acts.forEach((act) => {
            const list = stepsByAct.get(act.id) || [];
            list.forEach((step) => {
              step.choices.forEach((choice) => {
                if (inbound.has(choice.to)) {
                  inbound.set(choice.to, (inbound.get(choice.to) || 0) + 1);
                }
              });
            });
          });
          const orphaned = [];
          data.acts.forEach((act) => {
            const firstId = firstStepByAct.get(act.id);
            const list = stepsByAct.get(act.id) || [];
            list.forEach((step) => {
              if (step.id !== firstId && (inbound.get(step.id) || 0) === 0) {
                orphaned.push(`${path}: ${step.id} in ${act.id} has no inbound`);
              }
            });
          });
          expect(orphaned, `${path} orphan steps`).to.deep.eq([]);
        });
      });
    });
  });
});


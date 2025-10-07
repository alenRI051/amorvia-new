/// <reference types="cypress" />

// Node runs this file, so we can glob synchronously for all scenario files
const glob = require('glob');
const FILES = glob.sync('public/data/*.v2.json'); // all v2 scenarios

const SAFE_RANGE = { min: -2, max: 2 };
const isSafeDelta = (n) => Number.isFinite(n) && n >= SAFE_RANGE.min && n <= SAFE_RANGE.max;

describe('Amorvia: repo-wide scenario smoke checks (v2 schema)', () => {
  if (!FILES.length) {
    it('has scenario files', () => {
      throw new Error('No files matched public/data/*.v2.json');
    });
    return;
  }

  FILES.forEach((path) => {
    describe(path, () => {
      let data;
      let stepIds = new Set();
      let actIds = new Set();
      let firstStepByAct = new Map();

      before(() => {
        cy.readFile(path).then((json) => {
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
        expect(data).to.have.property('acts').that.is.an('array').and.not.empty;
      });

      it('each act has steps and each step has ≥2 valid choices', () => {
        data.acts.forEach((act) => {
          expect(act).to.have.property('id').that.is.a('string');
          expect(act).to.have.property('title').that.is.a('string');
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
              expect(choice).to.have.property('effects').that.is.an('object'); // v2 effects object
            });
          });
        });
      });

      it('all "to" pointers resolve to an existing step/act id or "menu"', () => {
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

      it('effects only touch known meters and use safe deltas (±2)', () => {
        const knownMeters = Object.keys(data.meters || {});
        const invalids = [];

        data.acts.forEach((act) => {
          act.steps.forEach((step) => {
            step.choices.forEach((choice) => {
              const eff = choice.effects || {};
              Object.entries(eff).forEach(([k, v]) => {
                if (!knownMeters.includes(k)) {
                  invalids.push(`${step.id}/${choice.id}: unknown meter "${k}"`);
                } else if (!isSafeDelta(v)) {
                  invalids.push(`${step.id}/${choice.id}: ${k} delta ${v} out of ${SAFE_RANGE.min}..${SAFE_RANGE.max}`);
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
    });
  });
});

/// <reference types="cypress" />

// Repo-wide smoke for all v2 scenarios without using Node 'glob' (works in Cypress runner)
const SAFE_RANGE = { min: -2, max: 2 };
const isSafeDelta = (n) => Number.isFinite(n) && n >= SAFE_RANGE.min && n <= SAFE_RANGE.max;

describe('Amorvia: repo-wide scenario smoke checks (v2 schema)', () => {
  it('validates every public/data/*.v2.json', () => {
    // Use shell to list files to avoid Node "node:*" imports in Cypress bundler
    cy.exec('ls -1 public/data/*.v2.json').then(({ stdout }) => {
      const files = stdout.trim().split('\n').filter(Boolean);
      expect(files.length, 'at least one v2 scenario present').to.be.greaterThan(0);

      files.forEach((path) => {
        cy.readFile(path).then((data) => {
          // --- Top-level checks
          expect(data, `${path} top-level`).to.have.property('id').that.is.a('string');
          expect(data, `${path} top-level`).to.have.property('title').that.is.a('string');
          expect(data, `${path} top-level`).to.have.property('version', 2);
          expect(data, `${path} meters`).to.have.property('meters').that.is.an('object');
          const knownMeters = Object.keys(data.meters || {});
          expect(knownMeters.length, `${path} meters non-empty`).to.be.greaterThan(0);
          expect(data, `${path} acts`).to.have.property('acts').that.is.an('array').and.not.empty;

          // --- Collect ids + first steps
          const stepIds = new Set();
          const actIds = new Set();
          const firstStepByAct = new Map();

          (data.acts || []).forEach((act) => {
            expect(act, `${path} act`).to.have.property('id').that.is.a('string');
            expect(act, `${path} act`).to.have.property('title').that.is.a('string');
            expect(act, `${path} act steps`).to.have.property('steps').that.is.an('array').and.not.empty;

            actIds.add(act.id);
            const first = act.steps?.[0]?.id;
            if (first) firstStepByAct.set(act.id, first);

            act.steps.forEach((s) => stepIds.add(s.id));
          });

          // --- Step + choice shape
          data.acts.forEach((act) => {
            act.steps.forEach((step) => {
              expect(step, `${path} step`).to.have.property('id').that.is.a('string');
              expect(step, `${path} step text`).to.have.property('text').that.is.a('string');
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
          const validTargets = new Set(['menu', ...stepIds, ...actIds]);
          const badTargets = [];
          data.acts.forEach((act) => {
            act.steps.forEach((step) => {
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
            act.steps.forEach((step) => {
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
          const orphaned = [];
          data.acts.forEach((act) => {
            const firstId = firstStepByAct.get(act.id);
            act.steps.forEach((step) => {
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

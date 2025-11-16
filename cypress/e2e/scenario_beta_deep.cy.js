// cypress/e2e/scenario_beta_deep.cy.js

const COMPLETED_SCENARIOS = [
  { id: 'co-parenting-with-bipolar-partner', label: 'Co-Parenting with Bipolar Partner' },
  { id: 'cultural-or-religious-difference', label: 'Cultural or Religious Difference in Co-Parenting' },
  { id: 'scene-tense-pickups-and-dropoffs', label: 'Scene: Tense Pickups & Dropoffs' },
  { id: 'dating-after-breakup-with-child-involved', label: 'Dating After Breakup (With Child Involved)' },
  { id: 'scene-first-agreements', label: 'Scene: First Agreements' },
  { id: 'scene-new-introductions', label: 'Scene: New Introductions' },
  { id: 'scene-different-rules', label: 'Scene: Different Rules' },
  { id: 'scene-de-escalation', label: 'Scene: De-escalation' },
  { id: 'step-parenting-conflicts', label: 'Step-Parenting Conflicts' }
];

describe('Amorvia – completed scenarios deep test', () => {
  COMPLETED_SCENARIOS.forEach(({ id, label }) => {
    describe(label, () => {
      beforeEach(() => {
        // Use the same helper as other tests: /?scenario=<id> + v2 mode + Ready
        cy.visitScenario(id);
      });

      it('loads and shows dialog content', () => {
        cy.expectDialogHasText();
      });

      it('has choices and can walk several steps without crashing', () => {
        cy.walkScenarioSteps(6);
      });

      it('checks HUD meters only if HUD is present', () => {
        cy.get('body').then(($body) => {
          const meters = $body.find(
            '[data-testid="meter-trust"], [data-testid="meter-tension"], [data-testid="meter-childStress"]'
          );

          if (!meters.length) {
            cy.log('No HUD meters for this scenario; skipping HUD assertions.');
            return;
          }

          // If we DO have HUD, assert visibility and meter changes
          cy.wrap(meters).should('have.length.at.least', 1);

          const getMeterSnapshot = () =>
            cy.getHudMeters().then(($m) =>
              [...$m].map((el) => {
                const text = el.innerText.trim();
                const aria = el.getAttribute('aria-valuenow');
                return text || aria || '';
              })
            );

          let beforeSnapshot;

          getMeterSnapshot().then((snap) => {
            beforeSnapshot = snap;

            cy.walkScenarioSteps(8);

            getMeterSnapshot().then((afterSnap) => {
              const changed = afterSnap.some(
                (value, idx) => value !== beforeSnapshot[idx]
              );
              expect(changed, 'at least one HUD meter value changed').to.be.true;
            });
          });
        });
      });
    });
  });
});

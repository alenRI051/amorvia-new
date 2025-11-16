// cypress/e2e/scenario_beta_deep.cy.js

// Scenario IDs + dropdown labels
const COMPLETED_SCENARIOS = [
  {
    id: 'co-parenting-with-bipolar-partner',
    label: 'Co-Parenting with Bipolar Partner'
  },
  {
    id: 'cultural-or-religious-difference',
    label: 'Cultural or Religious Difference in Co-Parenting'
  },
  {
    id: 'scene-tense-pickups-and-dropoffs',
    label: 'Scene: Tense Pickups & Dropoffs'
  },
  {
    id: 'dating-after-breakup-with-child-involved',
    label: 'Dating After Breakup (With Child Involved)'
  },
  {
    id: 'scene-first-agreements',
    label: 'Scene: First Agreements'
  },
  {
    id: 'scene-new-introductions',
    label: 'Scene: New Introductions'
  },
  {
    id: 'scene-different-rules',
    label: 'Scene: Different Rules'
  },
  {
    id: 'scene-de-escalation',
    label: 'Scene: De-escalation'
  },
  {
    id: 'step-parenting-conflicts',
    label: 'Step-Parenting Conflicts'
  }
  // add more as they hit “beta”
];

describe('Amorvia – completed scenarios deep test', () => {
  COMPLETED_SCENARIOS.forEach(({ id, label }) => {
    describe(label, () => {
      beforeEach(() => {
        // Force v2 / branching mode before app bootstraps
        cy.visit('/', {
          onBeforeLoad(win) {
            win.localStorage.setItem('amorvia:mode', 'v2');
          }
        });

        // Sad čekaj da app bude Ready
        cy.get('[data-amorvia-status]', { timeout: 10000 })
          .should('contain.text', 'Ready');

        // Pick scenario from dropdown and start
        cy.selectScenarioAndStart(label);
      });

      it('loads, shows dialog content, and HUD meters', () => {
        cy.expectDialogHasText();

        cy.getHudMeters().should('have.length.at.least', 1);
      });

      it('has choices and can walk several steps without crashing', () => {
        cy.walkScenarioSteps(6);
      });

      it('eventually changes at least one HUD meter after several choices', () => {
        const getMeterSnapshot = () =>
          cy.getHudMeters().then(($meters) =>
            [...$meters].map((el) => {
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


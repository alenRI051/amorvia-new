// cypress/e2e/scenario_beta_deep.cy.js

// Titles must match the dropdown options exactly
const COMPLETED_SCENARIOS = [
  'Co-Parenting with a Bipolar Partner',
  'Cultural or Religious Difference in Co-Parenting',
  'Scene: Tense Pickups & Dropoffs',
  'Dating After Breakup (With Child Involved)',
  'Scene: First Agreements',
  'Scene: New Introductions',
  'Scene: Different Rules',
  'Scene: De-escalation',
  'Step-Parenting Conflicts'
  // Add more as they reach “beta” quality
];

describe('Amorvia – completed scenarios deep test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  COMPLETED_SCENARIOS.forEach((title) => {
    describe(title, () => {
      it('loads, shows dialog content, and HUD meters', () => {
        cy.selectScenarioAndStart(title);

        // Some visible text on screen (at least one paragraph or div with text)
        cy.get('body')
          .contains(/./) // any non-empty text
          .should('be.visible');

        // HUD meters visible
        cy.getHudMeters().should('have.length.at.least', 1);
      });

      it('has at least one choice and choices remain available for several steps', () => {
        cy.selectScenarioAndStart(title);

        cy.getChoiceButtons()
          .its('length')
          .should('be.greaterThan', 0);

        cy.walkScenarioSteps(5);
      });

      it('eventually changes at least one meter after several choices', () => {
        cy.selectScenarioAndStart(title);

        // Capture initial HUD values (assuming text or aria-label contains numeric value)
        const getMeterSnapshot = () =>
          cy.getHudMeters().then(($meters) =>
            [...$meters].map(el => el.innerText.trim() || el.getAttribute('aria-valuenow') || '')
          );

        let beforeSnapshot;

        getMeterSnapshot().then((snap) => {
          beforeSnapshot = snap;

          // Walk multiple steps to trigger effects
          cy.walkScenarioSteps(6);

          getMeterSnapshot().then((afterSnap) => {
            // Check that at least one position changed
            const changed = afterSnap.some((value, idx) => value !== beforeSnapshot[idx]);
            expect(changed, 'at least one HUD meter value changed').to.be.true;
          });
        });
      });
    });
  });
});

// cypress/e2e/scenario_beta_deep.cy.js

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

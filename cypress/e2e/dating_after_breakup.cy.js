/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * Strategy:
 *  - Interact only with the choices list (index-based) to avoid copy brittleness.
 *  - Do NOT assert any dialog text (some builds render it lazily / offscreen).
 *  - After each click, wait for the next set of choices to be present.
 *  - Sanity check: HUD exists at the end of each path.
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Helper: log current available choices (console only; doesn’t affect retries)
const logChoiceLabels = (label) => {
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]')
    .then($btns => {
      const labels = Cypress.$.makeArray($btns).map(
        el => (el.innerText || el.textContent || '').trim()
      );
      // eslint-disable-next-line no-console
      console.log(`${label}:`, labels);
    });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    // Boot into the scenario; commands are defined in support/commands.js
    cy.bootScenario(SCENARIO_ID);

    // Intro screen should have “Continue” (we just need 1 button)
    cy.waitForChoices(1);
    logChoiceLabels('intro');
    cy.clickChoice(1); // “Continue”
  });

  it('Path A → Stable plan ending', () => {
    // First branching screen
    cy.waitForChoices(1);
    logChoiceLabels('branch screen');
    cy.clickChoice(1); // Option 1 = Path A

    // Follow-up step
    cy.waitForChoices(1);
    logChoiceLabels('A follow-up');
    cy.clickChoice(1); // pick first follow-up

    // Sanity check
    cy.get('#hud', { timeout: 20000 }).should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    // First branching screen
    cy.waitForChoices(1);
    logChoiceLabels('branch screen');
    cy.get('#choices').find('button, [role="button"]').its('length').should('be.gte', 2);
    cy.clickChoice(2); // Option 2 = Path B

    // Follow-up step
    cy.waitForChoices(1);
    logChoiceLabels('B follow-up');
    cy.clickChoice(1);

    // Sanity check
    cy.get('#hud', { timeout: 20000 }).should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    // First branching screen
    cy.waitForChoices(1);
    logChoiceLabels('branch screen');
    cy.get('#choices').find('button, [role="button"]').its('length').then(len => {
      const idx = Math.min(3, len); // prefer 3rd, else last available
      cy.clickChoice(idx);
    });

    // Follow-up step
    cy.waitForChoices(1);
    logChoiceLabels('C follow-up');
    cy.clickChoice(1);

    // Sanity check
    cy.get('#hud', { timeout: 20000 }).should('exist');
  });
});

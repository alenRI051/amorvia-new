// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  // NOTE: beforeEach is handled in support/e2e.js (bootScenario + ensure v2)

  it('Path A → Stable plan ending', () => {
    // Make sure we actually have choices on screen
    cy.waitForChoices(1);

    // Click through your intended path by label or index
    // Example labels (adjust to your real UI text):
    cy.clickChoice(/neutral.*heads?-?up/i); // step 1
    cy.waitForChoices(1);

    // keep choosing…
    // cy.clickChoice(/keep it brief/i);
    // cy.waitForChoices(1);

    // Eventually, click finish
    cy.clickChoice(/finish/i);
  });

  it('Path B → Fragile truce ending', () => {
    cy.waitForChoices(1);
    // Example: choose by index if labels shift
    // (1-based convenience)
    cy.clickChoice(1);
    cy.waitForChoices(1);
    cy.clickChoice(2);
    cy.waitForChoices(1);
    // …
  });

  it('Path C → Separate lanes ending', () => {
    cy.waitForChoices(1);
    // mix of label and index
    cy.clickChoice(/avoid the topic/i);
    cy.waitForChoices(1);
    cy.clickChoice(2);
    cy.waitForChoices(1);
    // …
  });
});

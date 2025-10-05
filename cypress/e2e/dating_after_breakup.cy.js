// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.bootScenario('dating-after-breakup-with-child-involved');
  });

  // Path A – Stable plan ending
  it('Path A → Stable plan ending', () => {
    // Act 1
    cy.clickChoiceIndex(0); // e.g., "Be open"
    cy.clickChoiceIndex(0); // e.g., "Affirm shared priority"

    // Act 2 (indexes follow the on-screen order for this path)
    cy.clickChoiceIndex(0); // "Continue"
    cy.clickChoiceIndex(0); // "Neutral, child-first heads-up"
    cy.clickChoiceIndex(0); // "Continue"
    cy.clickChoiceIndex(0); // "90-day no intros + only schedule-relevant info"
    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });

  // Path B – Fragile truce ending
  it('Path B → Fragile truce ending', () => {
    // Act 1
    cy.clickChoiceIndex(1); // e.g., "Not ready to discuss"
    cy.clickChoiceIndex(1); // e.g., "Share when it's relevant"

    // Act 2
    cy.clickChoiceIndex(0); // Continue
    cy.clickChoiceIndex(1); // e.g., "Avoid the topic"
    cy.clickChoiceIndex(0); // Continue
    cy.clickChoiceIndex(1); // e.g., "Ask what helps them feel safe"
    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });

  // Path C – Separate lanes ending
  it('Path C → Separate lanes ending', () => {
    // Act 1
    cy.clickChoiceIndex(2); // e.g., "Deflect"
    cy.clickChoiceIndex(1); // e.g., "Follow up later"

    // Act 2
    cy.clickChoiceIndex(0); // Continue
    cy.clickChoiceIndex(2); // e.g., "Share lots of details"
    cy.clickChoiceIndex(0); // Continue
    cy.clickChoiceIndex(2); // e.g., "Intros soon"
    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });
});

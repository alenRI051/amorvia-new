// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    // boot the multi-act scenario fresh each test
    cy.bootScenario('dating-after-breakup-with-child-involved');
  });

  it('Path A → Stable plan ending', () => {
    // Act 1
    cy.clickChoice(/Be open/i);
    cy.clickChoice(/Affirm shared priority/i);

    // Act 2
    cy.clickChoice(/continue/i); // a2_line1 → a2_choice1
    cy.clickChoice(/neutral, child-first heads-up/i);
    cy.clickChoice(/continue/i); // a2_line2a → a2_choice2
    cy.clickChoice(/90-day no intros \+ only schedule-relevant info/i);

    // End of Act 2, finish
    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });

  it('Path B → Fragile truce ending', () => {
    // Act 1
    cy.clickChoice(/not ready to discuss/i);
    cy.clickChoice(/share when it's relevant/i);

    // Act 2
    cy.clickChoice(/continue/i);
    cy.clickChoice(/avoid the topic/i);
    cy.clickChoice(/continue/i);
    cy.clickChoice(/ask what helps them feel safe/i);

    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });

  it('Path C → Separate lanes ending', () => {
    // Act 1
    cy.clickChoice(/^Deflect/i);
    cy.clickChoice(/Follow up later/i);

    // Act 2
    cy.clickChoice(/continue/i);
    cy.clickChoice(/share lots of details/i);
    cy.clickChoice(/continue/i);
    cy.clickChoice(/intros soon/i);

    cy.contains('button, [role="button"]', /finish/i, { timeout: 20000 }).click();
  });
});


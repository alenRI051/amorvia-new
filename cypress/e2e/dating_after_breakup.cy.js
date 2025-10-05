// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.bootScenario('dating-after-breakup-with-child-involved');
  });

  it('Path A → Stable plan ending', () => {
    // Act 1
    cy.pick(/be open/i);              // A
    cy.pick(/affirm shared priority/i); // A1

    // Should transition into Act 2 start (choices visible again)
    cy.get('#choices', { timeout: 20000 })
      .find('button, [role="button"]')
      .should('have.length.greaterThan', 0);

    // Act 2
    cy.pick(/neutral.*heads-up/i);    // a2_c1
    cy.pick(/90-day.*no intros/i);    // a2_c2a

    // End of Act 2 (end node might present a single Finish/Continue)
    cy.contains('button, [role="button"]', /finish|continue/i, { timeout: 10000 }).click();

    // Act 3 start should show choices again (wired by your v2 script)
    cy.get('#choices', { timeout: 20000 })
      .find('button, [role="button"]')
      .should('have.length.greaterThan', 0);

    // (If you have Act 3, continue assertions here or just ensure we reached it)
  });

  it('Path B → Fragile truce ending', () => {
    // Act 1
    cy.pick(/not ready to discuss/i); // B
    cy.pick(/share when.*relevant/i); // B1

    // Act 2
    cy.pick(/avoid the topic/i);      // a2_c3
    cy.pick(/ask what helps them feel safe/i); // a2_c2c

    cy.contains('button, [role="button"]', /finish|continue/i, { timeout: 10000 }).click();
    cy.get('#choices', { timeout: 20000 })
      .find('button, [role="button"]')
      .should('have.length.greaterThan', 0);
  });

  it('Path C → Separate lanes ending', () => {
    // Act 1
    cy.pick(/deflect/i);              // C
    cy.pick(/leave it be/i);          // C2

    // Act 2
    cy.pick(/share lots of details/i); // a2_c2
    cy.pick(/intros soon/i);           // a2_c2b

    cy.contains('button, [role="button"]', /finish|continue/i, { timeout: 10000 }).click();
    cy.get('#choices', { timeout: 20000 })
      .find('button, [role="button"]')
      .should('have.length.greaterThan', 0);
  });
});

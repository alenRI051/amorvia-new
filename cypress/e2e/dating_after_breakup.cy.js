describe('Dating After Breakup (With Child Involved)', () => {
  // This runs automatically before each test (A, B, C)
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.bootScenario('dating-after-breakup-with-child-involved');
  });

  it('Path A → Stable plan ending', () => {
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', 'Be open', { matchCase: false }).click();
    });
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', 'Affirm shared priority', { matchCase: false }).click();
    });
    cy.get('#dialog').should('contain.text', 'End of Act 1');
  });

  it('Path B → Fragile truce ending', () => {
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', 'not ready to discuss', { matchCase: false }).click();
    });
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', "I'll share when it's relevant", { matchCase: false }).click();
    });
    cy.get('#dialog').should('contain.text', 'End of Act 1');
  });

  it('Path C → Separate lanes ending', () => {
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', 'Deflect', { matchCase: false }).click();
    });
    cy.get('#choices').within(() => {
      cy.contains('button, [role="button"]', 'Follow up later', { matchCase: false }).click();
    });
    cy.get('#dialog').should('contain.text', 'End of Act 1');
  });
});

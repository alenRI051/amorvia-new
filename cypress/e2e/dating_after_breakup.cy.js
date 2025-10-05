describe('Dating After Breakup (With Child Involved)', () => {
  const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

  it('Path A → Stable plan ending', () => {
    cy.bootScenario(SCENARIO_ID);

    // Act 1
    cy.pickChoice(/be open/i);
    cy.pickChoice(/affirm shared priority/i);

    // App should auto-jump to Act 2 (per your wiring). If not, ensure boot logic does.
    // Act 2
    cy.pickChoice(/neutral.*heads-up/i);
    cy.pickChoice(/90-day no intros/i);

    cy.expectEnd();
  });

  it('Path B → Fragile truce ending', () => {
    cy.bootScenario(SCENARIO_ID);

    // Act 1
    cy.pickChoice(/not ready to discuss/i);
    cy.pickChoice(/share when it's relevant/i);

    // Act 2
    cy.pickChoice(/avoid the topic/i);
    cy.pickChoice(/intros soon/i);

    cy.expectEnd();
  });

  it('Path C → Separate lanes ending', () => {
    cy.bootScenario(SCENARIO_ID);

    // Act 1
    cy.pickChoice(/deflect/i);
    cy.pickChoice(/leave it be/i);

    // Act 2
    cy.pickChoice(/share lots of details/i);
    cy.pickChoice(/ask what helps/i);

    cy.expectEnd();
  });
});

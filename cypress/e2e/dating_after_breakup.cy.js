// cypress/e2e/dating_after_breakup.cy.js

const SCENARIO_TITLE = 'Dating After Breakup (With Child Involved)';

// Helper: visit with cache busters
function visitFresh() {
  const qs = `?nosw=1&devcache=0&_=${Date.now()}`;
  cy.visit('/' + qs);
}

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    visitFresh();
    // Pick the scenario
    cy.selectScenario(SCENARIO_TITLE);
    // Ensure Act 1 is visible
    cy.seeAct(1);
    // Dialog should be populated
    cy.get('#dialog').should('not.be.empty');
  });

  it('Path A → Stable plan ending', () => {
    // Act 1
    cy.pick('Be open');                       // A
    cy.pick('Affirm shared priority');        // A1 → goto Act 2
    // Handoff to Act 2
    cy.seeAct(2);

    // Act 2
    cy.pick('Neutral, child-first heads-up'); // a2_c1
    cy.pick('90-day no intros');              // a2_c2a → goto Act 3
    cy.seeAct(3);

    // Act 3
    cy.pick('Own the miss');                  // a3_c1
    cy.pick('sync on expectations later');    // a3_c2a → goto Act 4
    cy.seeAct(4);

    // Act 4 (Stable)
    cy.pick('Stable plan');
    cy.get('#dialog').should('contain.text', 'Stable Resolution');
  });

  it('Path B → Fragile truce ending', () => {
    // Act 1
    cy.pick('not ready to discuss');          // B
    cy.pick('share when it\'s relevant');     // B1 → Act 2
    cy.seeAct(2);

    // Act 2
    cy.pick('Avoid the topic');               // a2_c3
    cy.pick('what helps them feel safe');     // a2_c2c → Act 3
    cy.seeAct(3);

    // Act 3
    cy.pick('step out for privacy');          // a3_c3
    cy.pick('Text later acknowledging');      // a3_c2c → Act 4
    cy.seeAct(4);

    // Act 4 (Truce)
    cy.pick('Fragile truce');
    cy.get('#dialog').should('contain.text', 'Fragile Truce');
  });

  it('Path C → Separate lanes ending', () => {
    // Act 1
    cy.pick('Deflect');                       // C
    cy.pick('Leave it be');                   // C2 → Act 2
    cy.seeAct(2);

    // Act 2
    cy.pick('Share lots of details');         // a2_c2
    cy.pick('Intros soon');                   // a2_c2b → Act 3
    cy.seeAct(3);

    // Act 3
    cy.pick('Downplay it');                   // a3_c2
    cy.pick('no follow-up needed');           // a3_c2b → Act 4
    cy.seeAct(4);

    // Act 4 (Separate lanes)
    cy.pick('Separate lanes');
    cy.get('#dialog').should('contain.text', 'Separate Lanes');
  });
});

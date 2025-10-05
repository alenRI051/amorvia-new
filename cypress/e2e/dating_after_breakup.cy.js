// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  const appUrl = '/?nosw=1&devcache=0'; // avoid SW caching in tests
  const scenarioId = 'dating-after-breakup-with-child-involved';

  function boot() {
    cy.visit(appUrl, {
      onBeforeLoad(win) {
        // make the app auto-load our scenario
        win.localStorage.setItem('amorvia:lastScenario', scenarioId);
      },
    });

    // wait for the first node text to render (Act 1 entry)
    cy.get('#dialog', { timeout: 20000 })
      .should('be.visible')
      .and(($el) => {
        expect($el.text().trim().length, 'dialog has text').to.be.greaterThan(0);
      });

    // choices should be populated for the first step
    cy.get('#choices', { timeout: 20000 }).children().should('have.length.greaterThan', 0);
  }

  beforeEach(() => {
    cy.clearLocalStorage();
    boot();
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
      cy.contains('button, [role="button"]', "not ready to discuss", { matchCase: false }).click();
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


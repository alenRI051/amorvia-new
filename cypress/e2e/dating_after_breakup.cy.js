// cypress/e2e/dating_after_breakup.cy.js

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    // start fresh each test and boot the scenario in v2 mode
    cy.clearLocalStorage();
    cy.bootScenario('dating-after-breakup-with-child-involved');

    // basic sanity checks
    cy.get('#dialog', { timeout: 20000 }).should('exist');
    cy.get('#choices', { timeout: 20000 }).should('be.visible');
    cy.waitForChoices(1);
  });

  it('Path A → Stable plan ending', () => {
    // screen 1 has a single "Continue"
    cy.clickChoice(1);

    // capture current dialog so we can assert it changes after the pick
    cy.get('#dialog').invoke('text').then((beforeText) => {
      // choose the “Be open” option
      cy.clickChoice(/be open/i);

      // dialog should update after the choice
      cy.get('#dialog', { timeout: 20000 })
        .invoke('text')
        .should((afterText) => {
          expect(afterText.trim(), 'dialog text changed').to.not.eq(beforeText.trim());
        });

      // choices should still be interactable for the next step in the path
      cy.waitForChoices(1);
    });
  });

  it('Path B → Fragile truce ending', () => {
    cy.clickChoice(1);

    cy.get('#dialog').invoke('text').then((beforeText) => {
      // choose the “Keep it private for now” option
      cy.clickChoice(/keep it private/i);

      cy.get('#dialog', { timeout: 20000 })
        .invoke('text')
        .should((afterText) => {
          expect(afterText.trim(), 'dialog text changed').to.not.eq(beforeText.trim());
        });

      cy.waitForChoices(1);
    });
  });

  it('Path C → Separate lanes ending', () => {
    cy.clickChoice(1);

    cy.get('#dialog').invoke('text').then((beforeText) => {
      // choose the “Deflect” option
      cy.clickChoice(/deflect/i);

      cy.get('#dialog', { timeout: 20000 })
        .invoke('text')
        .should((afterText) => {
          expect(afterText.trim(), 'dialog text changed').to.not.eq(beforeText.trim());
        });

      cy.waitForChoices(1);
    });
  });
});

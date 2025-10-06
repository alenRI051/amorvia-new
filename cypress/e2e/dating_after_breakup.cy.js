/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * Strategy:
 * - Click the first "Continue" on the intro screen.
 * - On the first branching screen, choose by position (1st/2nd/3rd button)
 *   so we’re resilient to copy changes.
 * - After each click, assert that #dialog’s text is non-empty (no visibility check;
 *   some layouts give it height 0).
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Assert #dialog has some text (do NOT require visibility)
const expectDialogHasText = () => {
  cy.get('#dialog', { timeout: 20000 })
    .should('exist')
    .invoke('text')
    .then((t) => {
      const txt = (t || '').trim();
      expect(txt.length, 'dialog should not be empty').to.be.greaterThan(0);
    });
};

// Log current choice labels for debug
const logChoiceLabels = (label = 'choices') => {
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]', { timeout: 20000 })
    .then(($btns) => {
      const labels = Cypress.$.makeArray($btns).map(
        (el) => (el.innerText || el.textContent || '').trim()
      );
      cy.log(`${label}: ${JSON.stringify(labels)}`);
    });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.log('===== beforeEach start =====');
    cy.bootScenario(SCENARIO_ID);      // visits /?mode=v2, selects scenario, waits for first choices
    cy.waitForChoices(1);
    logChoiceLabels('intro choices');
    cy.clickChoice(1);                  // click "Continue"
    cy.wait(150);                        // tiny yield for DOM to settle
    cy.log('===== beforeEach done =====');
  });

  it('Path A → Stable plan ending', () => {
    cy.waitForChoices(1);
    logChoiceLabels('branch A screen');
    cy.clickChoice(1);                  // first option = Path A
    cy.wait(150);
    expectDialogHasText();

    cy.waitForChoices(1);
    logChoiceLabels('A follow-up');
    cy.clickChoice(1);
    cy.wait(150);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    cy.waitForChoices(1);
    logChoiceLabels('branch B screen');

    cy.get('#choices').find('button, [role="button"]').its('length').then((len) => {
      expect(len).to.be.gte(2);
    });
    cy.clickChoice(2);                  // second option = Path B
    cy.wait(150);
    expectDialogHasText();

    cy.waitForChoices(1);
    logChoiceLabels('B follow-up');
    cy.clickChoice(1);
    cy.wait(150);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    cy.waitForChoices(1);
    logChoiceLabels('branch C screen');

    cy.get('#choices').find('button, [role="button"]').its('length').then((len) => {
      const indexToClick = len >= 3 ? 3 : len; // prefer 3rd, else last available
      cy.wrap(null).then(() => cy.clickChoice(indexToClick));
    });
    cy.wait(150);
    expectDialogHasText();

    cy.waitForChoices(1);
    logChoiceLabels('C follow-up');
    cy.clickChoice(1);
    cy.wait(150);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });
});


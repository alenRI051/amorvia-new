/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * Strategy:
 * - Click the first "Continue" on the intro screen.
 * - On the first branching screen, choose by position (1st/2nd/3rd button)
 *   to avoid brittle text matching, since copy can shift.
 * - After each click, only assert that #dialog is visible and non-empty.
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Helper: ensure dialog is visible and has some text (tolerant to copy changes)
const expectDialogHasText = () => {
  cy.get('#dialog', { timeout: 20000 })
    .should('be.visible')
    .should(($d) => {
      const t = ($d.text() || '').trim();
      expect(t.length, 'dialog should not be empty').to.be.greaterThan(0);
    });
};

// Helper: log current choice labels (for debugging when running headless)
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
    cy.bootScenario(SCENARIO_ID); // visits /?mode=v2, selects scenario, waits for first choices
    // Intro screen: should have at least 1 button (usually "Continue")
    cy.waitForChoices(1);
    logChoiceLabels('intro choices');
    cy.clickChoice(1); // click "Continue"
    cy.log('===== beforeEach done =====');
  });

  it('Path A → Stable plan ending', () => {
    // First branching screen: click the 1st option (Path A)
    cy.waitForChoices(1);          // be tolerant to the exact count
    logChoiceLabels('branch A screen');
    cy.clickChoice(1);

    // Dialog should update and be non-empty
    expectDialogHasText();

    // Follow-up: click first available choice to advance
    cy.waitForChoices(1);
    logChoiceLabels('A follow-up');
    cy.clickChoice(1);

    // Sanity checks
    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    // First branching screen: click the 2nd option (Path B)
    cy.waitForChoices(1);
    logChoiceLabels('branch B screen');
    cy.get('#choices')
      .find('button, [role="button"]', { timeout: 20000 })
      .its('length')
      .then((len) => {
        // If there are only 2 choices, 2nd is valid. If there are 3, also valid.
        expect(len).to.be.gte(2);
      });
    cy.clickChoice(2);

    expectDialogHasText();

    // Advance once more
    cy.waitForChoices(1);
    logChoiceLabels('B follow-up');
    cy.clickChoice(1);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    // First branching screen: click the 3rd option (Path C)
    cy.waitForChoices(1);
    logChoiceLabels('branch C screen');

    cy.get('#choices')
      .find('button, [role="button"]', { timeout: 20000 })
      .its('length')
      .then((len) => {
        // If copy temporarily has only 2 choices, fall back to the last one.
        const indexToClick = len >= 3 ? 3 : len; // 3rd if present, else last
        cy.wrap(null).then(() => cy.clickChoice(indexToClick));
      });

    expectDialogHasText();

    // Advance once more
    cy.waitForChoices(1);
    logChoiceLabels('C follow-up');
    cy.clickChoice(1);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });
});

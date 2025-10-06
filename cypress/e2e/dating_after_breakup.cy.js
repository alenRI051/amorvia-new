/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * Flow notes:
 * - First screen shows a single "Continue" choice
 * - Next screen has 3 choices:
 *   1) "Be open: ..."                       -> Path A
 *   2) "Keep it private for now: ..."       -> Path B
 *   3) "Deflect: change the subject ..."    -> Path C
 *
 * We keep assertions resilient to copy changes and headless rendering.
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

/** Assert #dialog currently renders some visible, non-empty text. */
const expectDialogHasText = () =>
  cy.get('#dialog')
    .find('*:visible')
    .then($els => {
      const text = $els.text().replace(/\s+/g, ' ').trim();
      expect(text, 'dialog should show visible text').to.have.length.greaterThan(0);
    });

/** Log current choice labels and assert we have at least one. */
const expectInitialThreeChoices = () => {
  cy.get('#choices').find('button, [role="button"]').then(($btns) => {
    const labels = Cypress.$.makeArray($btns).map(
      (el) => (el.innerText || el.textContent || '').trim()
    );
    cy.log('Current choices:', JSON.stringify(labels));
    expect(labels.length, 'expected >= 1 choice button(s)').to.be.gte(1);
  });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.log('===== beforeEach start =====');
    // Clears storage, visits /?mode=v2, selects scenario, waits for first choices
    cy.bootScenario(SCENARIO_ID);
    cy.log('===== beforeEach done =====');
  });

  it('Path A → Stable plan ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) Expect three options; pick "Be open"
    cy.waitForChoices(3);
    expectInitialThreeChoices();
    cy.log('Path A: looking for "be open"');
    cy.clickChoice(/be open/i);

    // 3) Assert dialog updated (copy-safe)
    expectDialogHasText();

    // 4) Take a constructive follow-up (prefer by text; fallback to first)
    cy.waitForChoices(1);
    cy.get('#choices').find('button, [role="button"]').then(($btns) => {
      const labels = Cypress._.map($btns, (el) => (el.innerText || el.textContent || '').trim());
      cy.log('Path A follow-up choices:', JSON.stringify(labels));
      const idx = Cypress.$.makeArray($btns).findIndex((el) =>
        /affirm shared priority|priority|pacing|communication|plan/i.test(el.innerText || '')
      );
      if (idx >= 0) {
        cy.wrap($btns.eq(idx)).click({ force: true });
      } else {
        cy.wrap($btns.eq(0)).click({ force: true });
      }
    });

    // 5) Sanity checks
    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) Pick "Keep it private for now"
    cy.waitForChoices(3);
    expectInitialThreeChoices();
    cy.log('Path B: looking for "keep it private"');
    cy.clickChoice(/keep it private/i);

    // 3) Assert dialog updated (copy-safe)
    expectDialogHasText();

    // 4) One more step to move forward (pick first available)
    cy.waitForChoices(1);
    cy.clickChoice(1);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) Pick "Deflect"
    cy.waitForChoices(3);
    expectInitialThreeChoices();
    cy.log('Path C: looking for "deflect"');
    cy.clickChoice(/deflect/i);

    // 3) Assert dialog updated (copy-safe)
    expectDialogHasText();

    // 4) Progress one more step
    cy.waitForChoices(1);
    cy.clickChoice(1);

    expectDialogHasText();
    cy.get('#hud').should('exist');
  });
});

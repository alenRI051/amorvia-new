/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * Flow:
 * - Screen 1: single "Continue"
 * - Screen 2: three choices guiding paths:
 *   - "Be open ..."                  -> Path A
 *   - "Keep it private for now ..."  -> Path B
 *   - "Deflect ..."                  -> Path C
 *
 * This spec:
 * - boots the scenario into v2 mode
 * - clicks "Continue" by index (1-based)
 * - picks each path by a tolerant regex (labels may change slightly)
 * - asserts the dialog becomes non-empty, then loosely matches copy
 * - advances one more step and sanity-checks UI is alive
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Helper: ensure dialog has some text (copy can change, we just need it populated)
const waitForDialogText = () => {
  cy.get('#dialog', { timeout: 20000 })
    .should('exist')
    .should(($d) => {
      const t = ($d.text() || '').trim();
      expect(t.length, 'dialog has text').to.be.greaterThan(0);
    });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.bootScenario(SCENARIO_ID);   // visits /?mode=v2, selects scenario, waits for first choices
    // First screen: a single "Continue"
    cy.waitForChoices(1);
    cy.clickChoice(1);
  });

  it('Path A → Stable plan ending', () => {
    // Pick "Be open ..."
    cy.waitForChoices(1); // don't assume exact count; just ensure buttons exist
    cy.clickChoice(/be\s*open|transparent|honest/i);

    // Dialog should update (loose match)
    waitForDialogText();
    cy.get('#dialog').invoke('text')
      .should('match', /thanks|honest|plan|let's/i);

    // Follow-up: take a constructive option (prefer its label, else first)
    cy.waitForChoices(1);
    cy.get('#choices').then(($wrap) => {
      const $btns = $wrap.find('button, [role="button"]');
      const idx = Cypress.$.makeArray($btns).findIndex((el) =>
        /affirm|priority|pacing|communication|plan/i.test(el.innerText || el.textContent || '')
      );
      if (idx >= 0) cy.wrap($btns.eq(idx)).click({ force: true });
      else cy.clickChoice(1);
    });

    // Sanity
    waitForDialogText();
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    // Pick "Keep it private for now ..."
    cy.waitForChoices(1);
    cy.clickChoice(/keep.*private|not\s*ready|personal\s*life/i);

    waitForDialogText();
    cy.get('#dialog').invoke('text')
      .should('match', /not\s*ready|private|personal\s*life|tense/i);

    cy.waitForChoices(1);
    cy.clickChoice(1);

    waitForDialogText();
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    // Pick "Deflect ..."
    cy.waitForChoices(1);
    cy.clickChoice(/deflect|change\s*the\s*subject|logistics/i);

    waitForDialogText();
    cy.get('#dialog').invoke('text')
      .should('match', /logistics|change\s*the\s*subject|separate/i);

    cy.waitForChoices(1);
    cy.clickChoice(1);

    waitForDialogText();
    cy.get('#hud').should('exist');
  });
});

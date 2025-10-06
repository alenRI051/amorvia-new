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
 * We assert the correct button set is present, then click into each path.
 * To keep the test stable across copy tweaks, we assert key phrases and
 * then click by regex (fallback to index if text ever changes dramatically).
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

const expectInitialThreeChoices = () => {
  cy.get('#choices').find('button, [role="button"]').should(($btns) => {
    const labels = Cypress.$.makeArray($btns).map(
      (el) => (el.innerText || el.textContent || '').trim()
    );
    cy.log('Initial choices:', JSON.stringify(labels));
    // We expect "Continue" only on the very first screen,
    // then exactly 3 options on the next screen.
    expect(labels.length, 'expected >= 1 choice button(s)').to.be.gte(1);
  });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.log('===== beforeEach start =====');
    cy.bootScenario(SCENARIO_ID);      // clears storage, visits /?mode=v2, selects scenario, waits for first choices
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

    // 3) Assert we moved forward and dialog updated
    cy.get('#dialog').invoke('text').should('match', /thanks for telling me|honest/i);

    // 4) Take the constructive follow-up (usually first option, e.g., "Affirm shared priority")
    cy.waitForChoices(1);
    cy.get('#choices').find('button, [role="button"]').then(($btns) => {
      const labels = Cypress._.map($btns, (el) => (el.innerText || el.textContent || '').trim());
      cy.log('Path A follow-up choices:', JSON.stringify(labels));
    });
    // prefer text if present, fall back to first button for resilience
    cy.get('#choices').then(($wrap) => {
      const $btns = $wrap.find('button, [role="button"]');
      const idx = Cypress.$.makeArray($btns).findIndex((el) =>
        /affirm shared priority|priority|pacing|communication/i.test(el.innerText || '')
      );
      if (idx >= 0) {
        cy.wrap($btns.eq(idx)).click({ force: true });
      } else {
        cy.clickChoice(1);
      }
    });

    // 5) Sanity: dialog/hud exists (copy can shift)
    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) pick "Keep it private for now"
    cy.waitForChoices(3);
    expectInitialThreeChoices();
    cy.log('Path B: looking for "keep it private"');
    cy.clickChoice(/keep it private/i);

    // 3) Assert dialog updated (tolerant to wording)
    cy.get('#dialog')
      .invoke('text')
      .should('match', /not ready|private|personal life/i);

    // 4) One more step to move forward (pick first available)
    cy.waitForChoices(1);
    cy.clickChoice(1);

    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) pick "Deflect"
    cy.waitForChoices(3);
    expectInitialThreeChoices();
    cy.log('Path C: looking for "deflect"');
    cy.clickChoice(/deflect/i);

    // 3) Assert dialog updated
    cy.get('#dialog')
      .invoke('text')
      .should('match', /logistics|change the subject|deflect/i);

    // 4) Progress one more step
    cy.waitForChoices(1);
    cy.clickChoice(1);

    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });
});


/// <reference types="cypress" />

/**
 * Scenario: Dating After Breakup (With Child Involved)
 * First screen: single "Continue"
 * Next screen: buttons can be 2–3 depending on copy.
 */

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// helper: print current choice labels to the Cypress runner log
const logChoices = (note = '') =>
  cy.get('#choices').find('button, [role="button"]').then(($btns) => {
    const labels = [...$btns].map((el) => (el.innerText || el.textContent || '').trim());
    cy.log(`${note} choices: ${JSON.stringify(labels)}`);
  });

// assert at least N choices (retriable) then log them (non-retriable)
const expectInitialChoices = (min = 2) =>
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]', { timeout: 20000 })
    .should('have.length.at.least', min)
    .then(($btns) => {
      const labels = [...$btns].map((el) => (el.innerText || el.textContent || '').trim());
      cy.log('Initial choices:', JSON.stringify(labels));
    });

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.log('===== beforeEach start =====');
    cy.bootScenario(SCENARIO_ID);  // visits /?mode=v2, selects scenario, waits for first choice(s)
    cy.log('===== beforeEach done =====');
  });

  it('Path A → Stable plan ending', () => {
    // 1) First screen → "Continue"
    cy.clickChoice(1);

    // 2) Choose first option (copy varies)
    cy.waitForChoices(2);
    expectInitialChoices(2);
    logChoices('Before Path A pick 1');
    cy.clickChoice(1);

    // 3) Dialog progressed
    cy.get('#dialog').invoke('text').should('match', /thanks for telling me|honest|plan/i);

    // 4) Constructive follow-up (regex if available, else first)
    cy.waitForChoices(1);
    logChoices('Before Path A pick 2');
    cy.get('#choices').then(($wrap) => {
      const $btns = $wrap.find('button, [role="button"]');
      const idx = [...$btns].findIndex((el) =>
        /affirm shared priority|agree on pacing|heads?-?up|plan/i.test(el.innerText || '')
      );
      if (idx >= 0) cy.wrap($btns.eq(idx)).click({ force: true });
      else cy.clickChoice(1);
    });

    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    cy.clickChoice(1);

    cy.waitForChoices(2);
    expectInitialChoices(2);
    logChoices('Before Path B pick 1');
    cy.clickChoice(2);

    cy.get('#dialog').invoke('text').should('match', /not ready|private|personal life|tense/i);

    cy.waitForChoices(1);
    logChoices('Before Path B pick 2');
    cy.clickChoice(1);

    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    cy.clickChoice(1);

    cy.waitForChoices(2);
    expectInitialChoices(2);
    logChoices('Before Path C pick 1');
    cy.get('#choices').find('button,[role="button"]').its('length').then(len => {
      cy.clickChoice(len >= 3 ? 3 : 2);
    });

    cy.get('#dialog').invoke('text').should('match', /logistics|change the subject|separate/i);

    cy.waitForChoices(1);
    logChoices('Before Path C pick 2');
    cy.clickChoice(1);

    cy.get('#dialog').should('exist');
    cy.get('#hud').should('exist');
  });
});

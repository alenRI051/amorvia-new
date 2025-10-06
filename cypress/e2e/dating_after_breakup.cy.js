/// <reference types="cypress" />

// Scenario id your app understands
const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Retry until #dialog has *some* text (no visibility requirement)
const waitForDialogNonEmpty = () => {
  cy.get('#dialog', { timeout: 20000 }).should($el => {
    const txt = ($el.text() || '').trim();
    expect(txt.length, 'dialog text should not be empty').to.be.greaterThan(0);
  });
};

// (Debug) log current choice labels without affecting retries
const logChoiceLabels = (label) => {
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]')
    .then($btns => {
      const labels = Cypress.$.makeArray($btns).map(
        el => (el.innerText || el.textContent || '').trim()
      );
      // eslint-disable-next-line no-console
      console.log(`${label}:`, labels);
    });
};

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.bootScenario(SCENARIO_ID);      // visits /?mode=v2, selects scenario
    cy.waitForChoices(1);              // intro has a single Continue
    logChoiceLabels('intro');
    cy.clickChoice(1);                 // click Continue
  });

  it('Path A → Stable plan ending', () => {
    cy.waitForChoices(1);              // first branching screen is ready
    logChoiceLabels('branch screen');

    cy.clickChoice(1);                 // Path A = first option
    waitForDialogNonEmpty();

    cy.waitForChoices(1);              // follow-up choice(s)
    logChoiceLabels('A follow-up');
    cy.clickChoice(1);                 // take first follow-up
    waitForDialogNonEmpty();

    cy.get('#hud').should('exist');
  });

  it('Path B → Fragile truce ending', () => {
    cy.waitForChoices(1);
    logChoiceLabels('branch screen');

    cy.get('#choices').find('button, [role="button"]').its('length').should('be.gte', 2);
    cy.clickChoice(2);                 // Path B = second option
    waitForDialogNonEmpty();

    cy.waitForChoices(1);
    logChoiceLabels('B follow-up');
    cy.clickChoice(1);
    waitForDialogNonEmpty();

    cy.get('#hud').should('exist');
  });

  it('Path C → Separate lanes ending', () => {
    cy.waitForChoices(1);
    logChoiceLabels('branch screen');

    cy.get('#choices').find('button, [role="button"]').its('length').then(len => {
      const idx = len >= 3 ? 3 : len;  // prefer 3rd, else last available
      cy.clickChoice(idx);
    });
    waitForDialogNonEmpty();

    cy.waitForChoices(1);
    logChoiceLabels('C follow-up');
    cy.clickChoice(1);
    waitForDialogNonEmpty();

    cy.get('#hud').should('exist');
  });
});


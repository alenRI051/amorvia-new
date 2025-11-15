// cypress/e2e/scene-tense-pickups-and-dropoffs.cy.js

describe('Scene: Tense Pickups & Dropoffs – smoke test', () => {
  it('loads, starts, and shows first act content', () => {
    // 1. Visit the app
    cy.visit('/');

    // 2. Pick the scenario from the dropdown
    cy.contains('label', 'Scenario')
      .parent()
      .find('select')
      .select('Scene: Tense Pickups & Dropoffs');

    // 3. Start the scenario
    cy.contains('button', /start/i).click();

    // 4. Assert first act *content* (not the act title)
    //   – this line just needs to match some stable text from a1s1
    cy.contains(/The school yard is full of kids/i, { timeout: 8000 })
      .should('be.visible');

    // 5. Make a first choice to ensure progression works
    cy.contains(
      'button',
      /Walk up together at a calm, steady pace/i
    ).click();

    // 6. Next node should appear (first follow-up in Act 1)
    cy.contains(/First Words at the Gate/i, { timeout: 8000 })
      .should('be.visible');
  });
});


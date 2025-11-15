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

    // 4. Assert that we see Act 1 content (Parking Lot Weather)
    cy.contains(/Parking Lot Weather/i).should('be.visible');
    cy.contains(/The school yard is full of kids/i).should('be.visible');

    // 5. Make a first choice to ensure progression works
    cy.contains(
      'button',
      /Walk up together at a calm, steady pace/i
    ).click();

    // 6. Next node should appear (First Words at the Gate)
    cy.contains(/First Words at the Gate/i).should('be.visible');
    cy.contains(/You’re late again/i).should('be.visible');
  });
});

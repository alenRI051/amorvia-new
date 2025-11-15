// cypress/e2e/scene-tense-pickups-and-dropoffs.cy.js

describe('Scene: Tense Pickups & Dropoffs – smoke test', () => {
  it('loads, starts, and shows HUD + first act', () => {
    // 1. Visit the app
    cy.visit('/');

    // 2. Pick the scenario from the dropdown
    // Adjust selector if your scenario select differs
    cy.contains('label', 'Scenario')
      .parent()
      .find('select')
      .select('Scene: Tense Pickups & Dropoffs');

    // 3. Start the scenario
    // Adjust button text if your UI says e.g. "Play" instead of "Start"
    cy.contains('button', /start/i).click();

    // 4. Assert that the HUD meters are visible
    // If you have data-testid hooks, replace these with those selectors
    cy.contains(/trust/i).should('be.visible');
    cy.contains(/tension/i).should('be.visible');
    cy.contains(/child\s*stress/i).should('be.visible');

    // 5. Assert that Act 1 content is visible
    cy.contains(/Parking Lot Weather/i).should('be.visible');
    cy.contains(/school yard is full of kids/i).should('be.visible');

    // 6. Make a first choice to ensure progression works
    cy.contains('button', /Walk up together at a calm, steady pace/i).click();

    // 7. Next node should appear (First Words at the Gate)
    cy.contains(/First Words at the Gate/i).should('be.visible');
    cy.contains(/You’re late again/i).should('be.visible');
  });
});

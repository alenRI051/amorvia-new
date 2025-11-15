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

    // 4. Assert some stable text from the first node (Act 1)
    //    Adjust this string if your actual first node text is slightly different.
    cy.contains(/school\s+yard/i, { timeout: 8000 }).should('be.visible');

    // 5. Make a first choice to ensure progression works
    cy.contains('button', /Walk up together/i).click();

    // 6. Next node should appear (Act 1 follow-up)
    cy.contains(/First Words at the Gate/i, { timeout: 8000 }).should('be.visible');
  });
});


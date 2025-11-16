// cypress/e2e/scene-tense-pickups-and-dropoffs.cy.js

describe('Scene: Tense Pickups & Dropoffs – smoke test', () => {
  it('loads, starts, and shows first act content + choices', () => {
    // 1. Visit the app
    cy.visit('/');

    // 2. Pick the scenario from the dropdown
    cy.contains('label', 'Scenario')
      .parent()
      .find('select')
      .select('Scene: Tense Pickups & Dropoffs');

    // 3. Start the scenario
    cy.contains('button', /start/i).click();

    // 4. Assert that the first scene text appears (Act 1 intro)
    //    Adjust the regex phrase if your intro text changes.
    cy.contains(/school\s+yard/i, { timeout: 8000 }).should('be.visible');

    // 5. At least one choice button should be present with non-empty text
    cy.get('button')
      .filter((_, el) => el.innerText.trim().length > 0)
      .its('length')
      .should('be.greaterThan', 0);
  });
});

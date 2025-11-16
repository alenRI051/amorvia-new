// cypress/e2e/scene-tense-pickups-and-dropoffs.cy.js

describe('Scene: Tense Pickups & Dropoffs – smoke test', () => {
  it('loads, starts, and shows first act content + HUD', () => {
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
    cy.contains(/school\s+yard/i, { timeout: 8000 }).should('be.visible');

    // 5. HUD meters should be visible somewhere on the screen
    cy.contains(/trust/i).should('be.visible');
    cy.contains(/tension/i).should('be.visible');
    cy.contains(/child\s*stress/i).should('be.visible');

    // 6. At least one choice button should be present
    cy.get('button')
      .filter((_, el) => el.innerText.trim().length > 0)
      .its('length')
      .should('be.greaterThan', 0);
  });
});


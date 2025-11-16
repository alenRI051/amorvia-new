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
    //    (Use any stable phrase from the first node – adjust if needed)
    cy.contains(/school\s+yard/i, { timeout: 8000 }).should('be.visible');

    // 5. HUD meters should be visible – use the SAME selectors as in hud_meters.cy.js
    //    If your test IDs differ, change them here to match.
    cy.get('[data-testid="meter-trust"]').should('be.visible');
    cy.get('[data-testid="meter-tension"]').should('be.visible');
    cy.get('[data-testid="meter-childStress"]').should('be.visible');

    // 6. At least one choice button should be present with non-empty text
    cy.get('button')
      .filter((_, el) => el.innerText.trim().length > 0)
      .its('length')
      .should('be.greaterThan', 0);
  });
});

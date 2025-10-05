// cypress/support/commands.js

// Wait for the app shell to be interactive and pick a scenario by id
Cypress.Commands.add('bootScenario', (scenarioId) => {
  // Ensure the entry patch had time to run and UI is ready
  cy.get('#scenarioPicker', { timeout: 20000 }).should('exist');

  // Select by value (the <option value="..."> should equal the scenario id)
  cy.get('#scenarioPicker').select(scenarioId);

  // The dialog area and choices should appear for Act 1
  cy.get('#dialog', { timeout: 20000 }).should('be.visible');
  cy.get('#choices', { timeout: 20000 }).should('exist');
});

// Click a choice button by (case-insensitive) text or RegExp
Cypress.Commands.add('clickChoice', (textOrRegex) => {
  const pattern = textOrRegex instanceof RegExp ? textOrRegex : new RegExp(textOrRegex, 'i');

  cy.get('#choices', { timeout: 20000 }).within(() => {
    cy.contains('button, [role="button"]', pattern, { timeout: 20000 }).click();
  });
});

// Assert the HUD meters exist (optional helper)
Cypress.Commands.add('assertMetersVisible', () => {
  cy.get('#hud', { timeout: 20000 }).should('exist');
});

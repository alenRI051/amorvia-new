// cypress/support/commands.js

// Wait for app shell & scenario picker, then select scenario by value
Cypress.Commands.add('bootScenario', (scenarioId) => {
  cy.get('#scenarioPicker', { timeout: 20000 }).should('exist');
  cy.get('#scenarioPicker').select(scenarioId);
  cy.get('#dialog', { timeout: 20000 }).should('be.visible');
  cy.get('#choices', { timeout: 20000 }).should('exist');
});

// Click a button by 0-based index within #choices
Cypress.Commands.add('clickChoiceIndex', (index) => {
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]', { timeout: 20000 })
    .eq(index)
    .click();
});

// Optional: click by text (kept for ad-hoc debugging)
Cypress.Commands.add('clickChoice', (textOrRegex) => {
  const pattern = textOrRegex instanceof RegExp ? textOrRegex : new RegExp(textOrRegex, 'i');
  cy.get('#choices', { timeout: 20000 }).within(() => {
    cy.contains('button, [role="button"]', pattern, { timeout: 20000 }).click();
  });
});


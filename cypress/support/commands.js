// cypress/support/commands.js

// Click a choice by visible label text in the #choices row
Cypress.Commands.add('pick', (labelText) => {
  cy.get('#choices').contains('button, [role="button"]', labelText, { matchCase: false }).click();
});

// Assert the Act badge equals “Act N”
Cypress.Commands.add('seeAct', (n) => {
  cy.get('#actBadge').should('contain.text', `Act ${n}`);
});

// Select scenario from the picker by title text
Cypress.Commands.add('selectScenario', (title) => {
  cy.get('#scenarioPicker').select(title, { force: true });
});

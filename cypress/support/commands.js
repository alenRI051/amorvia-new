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

// cypress/support/commands.js
Cypress.Commands.add('bootScenario', (scenarioId, url = '/?nosw=1&devcache=0') => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('amorvia:lastScenario', scenarioId);
    },
  });
  cy.get('#dialog', { timeout: 20000 }).should('be.visible');
  cy.get('#choices', { timeout: 20000 }).children().should('have.length.greaterThan', 0);
});

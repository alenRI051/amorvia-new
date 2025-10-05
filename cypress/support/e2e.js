// cypress/support/e2e.js
import './commands';

before(() => {
  cy.task('startServer');
});

after(() => {
  cy.task('stopServer');
});

beforeEach(() => {
  cy.clearLocalStorage();
  cy.visit('/');
});


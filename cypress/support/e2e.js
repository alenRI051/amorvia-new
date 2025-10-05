// cypress/support/e2e.js
import './commands';

// Start the static server once for this spec; stop when done.
before(() => {
  cy.task('startServer');
});

after(() => {
  cy.task('stopServer');
});

// For each test: clean state and (re)open the app’s root.
beforeEach(() => {
  cy.clearLocalStorage();
  cy.visit('/');
});

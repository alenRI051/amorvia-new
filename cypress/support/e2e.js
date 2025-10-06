// cypress/support/e2e.js

// Cypress 10+ support file
import './commands';

// If you have cy.task('startServer') wired in cypress.config.js, you can keep it.
// If not, rely on http-server started externally or skip this hook entirely.

beforeEach(() => {
  // Ensure a clean slate and v2 mode each test
  cy.clearLocalStorage();
  // Boot the specific scenario used by your spec(s)
  cy.bootScenario('dating-after-breakup-with-child-involved');
});

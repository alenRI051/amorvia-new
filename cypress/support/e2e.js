// cypress/support/e2e.js
// Load custom commands and set global hooks if needed.
import './commands';

// (Optional) log console errors to help debug CI flakes
Cypress.on('uncaught:exception', (err) => {
  // Returning false here prevents Cypress from failing the test on app errors.
  // Flip to `true` if you want app exceptions to fail tests.
  return false;
});

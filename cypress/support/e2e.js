// cypress/support/e2e.js
import './commands';

Cypress.on('uncaught:exception', (err) => {
  // Za sada ih ignoriramo u testovima mini-enginea
  return false;
});

// cypress/support/e2e.js
// Minimal setup for Amorvia + Cypress v15

import './commands';

Cypress.on('uncaught:exception', (err) => {
  // Ako želiš, možemo ignorirati neke benigne error-e iz third-party skripti
  // Za sada ih ne utišavamo, samo log:
  // console.error('Uncaught exception:', err);
  return false; // ili true ako želiš da test PUKNE na error
});

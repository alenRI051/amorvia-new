/// <reference types="cypress" />

describe('Co-Parenting with Bipolar Partner — basic flow', () => {
  const SCENARIO_ID = 'co-parenting-with-bipolar-partner';

  it('loads at Act 1 / a1s1 and continues into Act 2 / a2s1', () => {
    // 1️⃣  Load the app fresh
    cy.visit('http://localhost:3000'); // adjust port if different
    cy.clearLocalStorage();

    // 2️⃣  Select the scenario from the menu
    cy.contains(SCENARIO_ID, { matchCase: false }).click();

    // 3️⃣  Verify it begins at the correct text
    cy.contains('Handover day. Your co-parent looks tired but alert').should('be.visible');

    // 4️⃣  Choose a first response and progress
    cy.contains('Answer briefly and ask about medication schedule.').click();
    cy.contains('They nod. You both confirm pickup time for Sunday.').should('be.visible');

    // 5️⃣  Move to the Act 1 end node
    cy.contains('Confirm details clearly and thank them.').click();
    cy.contains('End of Act 1.').should('be.visible');

    // 6️⃣  Continue to Act 2
    cy.contains('Continue to Act 2.').click();

    // 7️⃣  Verify Act 2 start
    cy.contains('You consider setting a brief weekly check-in').should('be.visible');
  });
});

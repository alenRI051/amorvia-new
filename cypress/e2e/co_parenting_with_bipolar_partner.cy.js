/// <reference types="cypress" />

describe('Co-Parenting with Bipolar Partner — basic flow', () => {
  const TITLE_RE = /co-parenting with bipolar partner/i;

  it('loads at Act 1 / a1s1 and continues into Act 2 / a2s1', () => {
    // 1) Open the app
    cy.visit('http://localhost:3000');
    cy.clearLocalStorage();

    // 2) Open the scenario from the menu by its title
    cy.contains(TITLE_RE, { timeout: 10000 }).click();

    // Some UIs have a "Start" button; tap it if present
    cy.contains(/^start$/i, { timeout: 2000 }).click({ force: true }).optional;

    // 3) We expect either the first step OR (in the edge case) the Act 1 end node.
    cy.contains(/handover day\. your co-parent looks tired but alert/i, { timeout: 10000 })
      .then(() => {
        // In the normal path, pick first response, then proceed to act end
        cy.contains(/answer briefly and ask about medication schedule/i).click();
        cy.contains(/confirm pickup time for sunday/i).should('be.visible');
        cy.contains(/confirm details clearly and thank them/i).click();
        cy.contains(/end of act 1/i).should('be.visible');
      })
      .catch(() => {
        // Edge case: if it initially shows End of Act 1, continue anyway
        cy.contains(/end of act 1/i, { timeout: 4000 }).should('be.visible');
      })
      .then(() => {
        // 4) Continue into Act 2
        cy.contains(/continue to act 2/i).click();
        cy.contains(/brief weekly check-in/i, { timeout: 10000 }).should('be.visible');
      });
  });
});

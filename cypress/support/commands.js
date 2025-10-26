// cypress/support/commands.js

Cypress.on("uncaught:exception", () => false);

// Utility: wait until the v2 choices row has at least one visible choice
Cypress.Commands.add("ensureV2Choices", () => {
  cy.get("body").should("have.class", "v2");
  cy.get("#dialog").should("be.visible");
  cy.get("#choices.choices.row.v2-only").should(($el) => {
    const rect = $el[0].getBoundingClientRect();
    expect(rect.height).to.be.greaterThan(0);
  });
  cy.get("#choices .choice").should("have.length.at.least", 1);
});



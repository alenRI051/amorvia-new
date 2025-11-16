// cypress/e2e/scenario_all_smoke.cy.js

describe('Amorvia V2 – all scenarios smoke test', () => {
  let scenarios = [];

  before(() => {
    // Pull the current scenario list from v2-index
    cy.request('/data/v2-index.json')
      .its('body')
      .then((body) => {
        // Adjust if your index format is slightly different
        scenarios = body.scenarios || body;
      });
  });

  scenarios.forEach((scenario) => {
    const title = scenario.title || scenario.label || scenario.id;

    it(`loads and walks a few steps in scenario: ${title}`, () => {
      cy.visit('/');

      cy.selectScenarioAndStart(title);

      // Minimal assertion: page should show some content
      cy.get('body').should('not.be.empty');

      // Ensure at least one meaningful button exists
      cy.getChoiceButtons()
        .its('length')
        .should('be.greaterThan', 0);

      // Walk several steps to catch obvious crashes
      cy.walkScenarioSteps(4);
    });
  });
});

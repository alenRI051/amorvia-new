// cypress/e2e/scenario_smoke.cy.js

describe('Amorvia V2 – scenario smoke test (mini-engine)', () => {
  it('loads and walks a few steps in every scenario from v2-index', () => {
    cy.request('/data/v2-index.json').then((resp) => {
      const index = resp.body;
      const scenarios = index.scenarios || [];

      expect(scenarios.length, 'has at least one scenario').to.be.greaterThan(0);

      // Svaki scenarij prođemo u istom testu, redom
      scenarios.forEach((scn, i) => {
        const id = scn.id || scn.slug;
        const title = scn.title || id;

        cy.log(`Scenario #${i + 1}: ${title} (${id})`);

        cy.visitScenario(id);
        cy.expectDialogAndChoices();
        cy.walkScenarioSteps(6);
      });
    });
  });
});

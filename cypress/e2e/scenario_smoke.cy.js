// cypress/e2e/scenario_smoke.cy.js

describe('Amorvia V2 – scenario smoke test (mini-engine)', () => {
  it('loads and walks a few steps in every scenario from v2-index', () => {
    cy.request('/data/v2-index.json').then((resp) => {
      const index = resp.body;
      const scenarios = index.scenarios || [];

      expect(scenarios.length, 'has at least one scenario').to.be.greaterThan(0);

      scenarios.forEach((scn, i) => {
        const id = scn.id || scn.slug;
        const title = scn.title || id;

        cy.log(`Scenario #${i + 1}: ${title} (${id})`);

        cy.visitScenario(id);
        cy.expectDialogHasText();

        // Pokušaj hodati samo ako postoje choices
        cy.get('body').then(($body) => {
          const hasChoices = $body.find('[data-testid="choices"] button').length > 0;
          if (hasChoices) {
            cy.walkScenarioSteps(6);
          } else {
            cy.log(`Scenario ${id} has no interactive choices (info/menu/end screen).`);
          }
        });
      });
    });
  });
});


// Utility: wait for the scenario picker to be populated
Cypress.Commands.add('waitForScenarioList', () => {
  cy.get('#scenarioPicker', { timeout: 20000 })
    .should('exist')
    .find('option')
    .its('length')
    .should('be.greaterThan', 1); // more than the default blank
});

// Select Mode v2, then pick a scenario by id (value), then restart the act
Cypress.Commands.add('bootScenario', (scenarioId) => {
  cy.waitForScenarioList();

  // Ensure we're in Branching v2
  cy.get('#modeSelect', { timeout: 10000 }).select('v2', { force: true });

  // Pick scenario
  cy.get('#scenarioPicker').select(scenarioId, { force: true });

  // Restart act to force rendering from start
  cy.get('#restartAct').click();

  // Wait for dialog to render something
  cy.get('#dialog', { timeout: 15000 }).should('not.be.empty');

  // Ensure choices container is present (content may vary by node)
  cy.get('#choices', { timeout: 10000 }).should('exist');
});

// Click a visible choice button by text or regex (case-insensitive)
Cypress.Commands.add('pickChoice', (textOrRegex) => {
  const matcher = typeof textOrRegex === 'string' ? new RegExp(textOrRegex, 'i') : textOrRegex;
  cy.get('#choices', { timeout: 15000 })
    .find('button, [role="button"]', { timeout: 15000 })
    .contains(matcher)
    .click({ force: true });
});

// Assert we are at an END node by detecting the “Finish/End” UI shape
Cypress.Commands.add('expectEnd', () => {
  cy.get('#choices', { timeout: 10000 })
    .find('button, [role="button"]')
    .should(($btns) => {
      const texts = $btns.toArray().map((b) => b.innerText.trim().toLowerCase());
      expect(texts.join(' ')).to.match(/finish|end|continue/);
    });
});

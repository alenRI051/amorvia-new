Cypress.Commands.add('bootScenario', (scenarioId) => {
  cy.get('[data-testid="mode-select"]').select('v2', { force: true });
  cy.get('[data-testid="scenario-picker"]', { timeout: 10000 }).select(scenarioId, { force: true });
  cy.get('[data-testid="restart-act"]').click();
  cy.get('[data-testid="dialog"]', { timeout: 10000 }).should('not.be.empty');
  cy.get('[data-testid="choices"]', { timeout: 10000 }).should('exist');
});

Cypress.Commands.add('pickChoice', (textOrRegex) => {
  const matcher = typeof textOrRegex === 'string' ? new RegExp(textOrRegex, 'i') : textOrRegex;
  cy.get('[data-testid="choices"]', { timeout: 10000 })
    .find('button, [role="button"]')
    .contains(matcher)
    .click({ force: true });
});

Cypress.Commands.add('expectEnd', () => {
  cy.get('[data-testid="choices"]').find('button, [role="button"]').should(($btns) => {
    const texts = $btns.toArray().map((b) => b.innerText.trim().toLowerCase());
    expect(texts.join(' ')).to.match(/finish|end|continue/);
  });
});

// cypress/support/commands.js

// Boots the app directly into a given scenario (v2 mode), and waits until
// the dialog + at least one clickable choice is visible.
Cypress.Commands.add('bootScenario', (scenarioId, url = '/?nosw=1&devcache=0') => {
  cy.visit(url, {
    onBeforeLoad(win) {
      try { win.localStorage.setItem('amorvia:mode', 'v2'); } catch {}
      try { win.localStorage.setItem('amorvia:lastScenario', scenarioId); } catch {}
      try { win.localStorage.removeItem('amorvia:lastAct'); } catch {}
      try { win.localStorage.removeItem('amorvia:lastNode'); } catch {}
    },
  });

  // Dialog visible means app booted
  cy.get('#dialog', { timeout: 30000 }).should('be.visible');

  // Ensure choices are actually interactable
  cy.get('#choices', { timeout: 30000 })
    .find('button, [role="button"]', { timeout: 30000 })
    .should('have.length.greaterThan', 0);
});

// Click a choice by (partial) visible label, case-insensitive.
Cypress.Commands.add('pick', (labelText) => {
  const matcher = labelText instanceof RegExp ? labelText : new RegExp(labelText, 'i');
  cy.get('#choices', { timeout: 20000 })
    .contains('button, [role="button"]', matcher, { timeout: 20000 })
    .click({ force: true });
});

// Small helper to assert HUD snapshot text (optional; use if you render meter deltas)
Cypress.Commands.add('seeDialog', (snippet) => {
  const matcher = snippet instanceof RegExp ? snippet : new RegExp(snippet, 'i');
  cy.get('#dialog', { timeout: 20000 }).should('be.visible').and('contain.text', snippet);
});

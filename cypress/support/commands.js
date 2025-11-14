// cypress/support/commands.js

// Posjeti Amorviu s određenim scenarijem i čekaj da bude Ready
Cypress.Commands.add('visitScenario', (id) => {
  const qs = id ? `?scenario=${encodeURIComponent(id)}` : '';
  cy.visit('/' + qs);

  cy.get('[data-amorvia-status]', { timeout: 10000 })
    .should('contain.text', 'Ready');
});

// Samo provjeri da dialog ima neki tekst
Cypress.Commands.add('expectDialogHasText', () => {
  cy.get('[data-testid="dialog"]')
    .invoke('text')
    .should((text) => {
      expect(text.trim().length, 'dialog has text').to.be.greaterThan(0);
    });
});

// Prošetaj kroz nekoliko koraka scenarija — *samo ako postoje choices*
Cypress.Commands.add('walkScenarioSteps', (maxSteps = 6) => {
  function step(current) {
    if (current >= maxSteps) return;

    cy.get('body').then(($body) => {
      const buttons = $body.find('[data-testid="choices"] button');
      if (!buttons.length) {
        // nema choices → scenario je vjerojatno infopanel ili je završio
        cy.log('No choices available at step ' + current);
        return;
      }

      // klikni prvi choice
      cy.wrap(buttons.eq(0)).click();

      // dialog i dalje mora imati tekst
      cy.get('[data-testid="dialog"]')
        .invoke('text')
        .should((text) => {
          expect(text.trim().length, 'dialog has text after choice').to.be.greaterThan(0);
        });

      step(current + 1);
    });
  }

  step(0);
});


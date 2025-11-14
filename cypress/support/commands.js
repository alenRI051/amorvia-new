// cypress/support/commands.js

// Posjeti Amorviu s određenim scenarijem i čekaj da bude Ready
Cypress.Commands.add('visitScenario', (id) => {
  const qs = id ? `?scenario=${encodeURIComponent(id)}` : '';
  cy.visit('/' + qs);

  // pričekaj da naš status badge pokaže Ready
  cy.get('[data-amorvia-status]', { timeout: 10000 })
    .should('contain.text', 'Ready');
});

// Provjeri da dialog ima neki tekst i da postoji barem jedan choice
Cypress.Commands.add('expectDialogAndChoices', () => {
  cy.get('[data-testid="dialog"]')
    .invoke('text')
    .should((text) => {
      expect(text.trim().length, 'dialog has text').to.be.greaterThan(0);
    });

  cy.get('[data-testid="choices"] button')
    .its('length')
    .should('be.greaterThan', 0);
});

// Prošetaj kroz nekoliko koraka scenarija (uvijek bira prvi choice)
Cypress.Commands.add('walkScenarioSteps', (maxSteps = 6) => {
  function step(current) {
    if (current >= maxSteps) return;

    cy.get('body').then(($body) => {
      const buttons = $body.find('[data-testid="choices"] button');
      if (!buttons.length) {
        // nema više izbora → scenario je završio
        return;
      }

      // Klikni prvi choice
      cy.wrap(buttons.eq(0)).click();

      // dialog i dalje mora imati neki tekst
      cy.get('[data-testid="dialog"]')
        .invoke('text')
        .should((text) => {
          expect(text.trim().length, 'dialog has text after choice').to.be.greaterThan(0);
        });

      // idemo na sljedeći korak
      step(current + 1);
    });
  }

  step(0);
});

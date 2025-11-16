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
// Select a scenario by visible label in the dropdown and click Start
Cypress.Commands.add('selectScenarioAndStart', (labelText) => {
  cy.contains('label', 'Scenario')
    .parent()
    .find('select')
    .select(labelText);

  cy.contains('button', /start/i).click();
});

// Returns all visible "choice" buttons (excluding Start/Restart/etc)
// You can refine this selector if you add data-testid attributes later.
Cypress.Commands.add('getChoiceButtons', () => {
  return cy
    .get('button')
    .filter((_, el) => {
      const text = el.innerText.trim().toLowerCase();
      if (!text) return false;
      // Filter out generic app controls
      return !['start', 'restart', 'menu', 'back', 'close'].includes(text);
    });
});

// Simple helper: click a few choices in a row to ensure no crashes
Cypress.Commands.add('walkScenarioSteps', (steps = 3) => {
  for (let i = 0; i < steps; i += 1) {
    cy.getChoiceButtons()
      .then($btns => {
        if ($btns.length === 0) {
          // No more choices – probably end of path; just stop
          return;
        }
        // Click the first available choice
        cy.wrap($btns.eq(0)).click();
      });

    // After each click, ensure some text still exists on screen
    cy.get('body').should('not.be.empty');
  }
});

// HUD helpers – we already know these data-testids from your other test
Cypress.Commands.add('getHudMeters', () => {
  return cy.get('[data-testid="meter-trust"], [data-testid="meter-tension"], [data-testid="meter-childStress"]');
});


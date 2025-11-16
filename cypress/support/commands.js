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

// Select a scenario by visible label in the dropdown and click Start
// (korisno za ručne / legacy testove)
Cypress.Commands.add('selectScenarioAndStart', (labelText) => {
  cy.contains('label', 'Scenario')
    .parent()
    .find('select')
    .select(labelText);

  cy.contains('button', /start/i).click();
});

// Returns all visible "choice" buttons (excluding Start/Restart/etc)
// Fallback ako nema data-testid="choices"
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

// Prošetaj kroz nekoliko koraka scenarija — koristi choices, ili fallback na generičke gumbe
Cypress.Commands.add('walkScenarioSteps', (maxSteps = 6) => {
  function step(current) {
    if (current >= maxSteps) return;

    cy.get('body').then(($body) => {
      let $buttons = $body.find('[data-testid="choices"] button');

      if (!$buttons.length) {
        // fallback na generičke choice gumbe
        $buttons = $body.find('button').filter((_, el) => {
          const text = el.innerText.trim().toLowerCase();
          if (!text) return false;
          return !['start', 'restart', 'menu', 'back', 'close'].includes(text);
        });
      }

      if (!$buttons.length) {
        cy.log('No choices available at step ' + current);
        return;
      }

      // klikni prvi choice
      cy.wrap($buttons.eq(0)).click();

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

// HUD helpers – data-testid već postoji
Cypress.Commands.add('getHudMeters', () => {
  return cy.get(
    '[data-testid="meter-trust"], [data-testid="meter-tension"], [data-testid="meter-childStress"]',
    { timeout: 10000 }
  );
});


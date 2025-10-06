// cypress/support/commands.js

// Utility: wait until #choices has at least N buttons
Cypress.Commands.add('waitForChoices', (minCount = 1) => {
  cy.get('#choices', { timeout: 20000 }).should('be.visible');
  cy.get('#choices', { timeout: 20000 })
    .find('button, [role="button"]', { timeout: 20000 })
    .should(($btns) => {
      expect($btns.length, `expected >= ${minCount} choice button(s)`).to.be.gte(minCount);
    });
});

// Utility: click a choice by label (string/regex) OR by index (0-based or 1-based)
Cypress.Commands.add('clickChoice', (target) => {
  cy.get('#choices', { timeout: 20000 }).should('be.visible');

  if (typeof target === 'number') {
    // Accept 1-based index (common in test specs) or 0-based
    const idx = target >= 1 ? target - 1 : target;
    cy.get('#choices')
      .find('button, [role="button"]', { timeout: 20000 })
      .eq(idx)
      .click({ force: true });
    return;
  }

  // String or RegExp label
  const matcher = target instanceof RegExp ? target : new RegExp(`^\\s*${target}\\s*$`, 'i');

  cy.get('#choices')
    .find('button, [role="button"]', { timeout: 20000 })
    .should('have.length.greaterThan', 0)
    .then(($btns) => {
      const idx = Cypress.$.makeArray($btns).findIndex((el) =>
        matcher.test(el.innerText || el.textContent || '')
      );
      expect(idx, `button matching ${matcher}`).to.be.gte(0);
      cy.wrap($btns[idx]).click({ force: true });
    });
});

// Safe select by visible text or value (no .catch on Cypress chains!)
Cypress.Commands.add('safeSelect', (selector, target, options = {}) => {
  cy.get(selector, { timeout: 20000 })
    .should('be.visible')
    .then(($sel) => {
      const el = $sel[0];
      const opts = Array.from(el.options);
      const hasByText = opts.some((o) =>
        (o.text || '').trim().match(new RegExp(`^${target}$`, 'i'))
      );
      const hasByValue = opts.some((o) => (o.value || '').trim() === target);

      // debug dump
      const available = opts.map((o) => (o.text || '').trim() || o.value).join(' | ');
      cy.log(`safeSelect("${selector}", "${target}") available: [${available}]`);

      if (!hasByText && !hasByValue) {
        throw new Error(`Option "${target}" not found in ${selector}`);
      }

      cy.wrap($sel).select(target, { force: true, ...options });
    });
});

// Force UI into v2 mode so `.v2-only` content (choices, HUD) is visible
Cypress.Commands.add('ensureV2Mode', () => {
  // Visit with mode hint (harmless if the app ignores it)
  cy.location().then((loc) => {
    if (!/\bmode=v2\b/.test(loc.search)) {
      cy.visit(`/?mode=v2`);
    }
  });

  // If the app exposes a mode select, set it explicitly (without .catch)
  cy.get('body').then(($body) => {
    const hasModeSelect = $body.find('#modeSelect').length > 0;
    if (!hasModeSelect) return;

    cy.get('#modeSelect', { timeout: 20000 }).then(($sel) => {
      const opts = Array.from($sel[0].options);
      const labels = opts.map((o) => (o.text || '').trim() || o.value);
      cy.log(`Mode options: [${labels.join(' | ')}]`);

      const hasValueV2 = opts.some((o) => (o.value || '').trim() === 'v2');
      const textV2 = opts.find((o) => /Branching v2/i.test(o.text || ''))?.text;

      if (hasValueV2) {
        cy.wrap($sel).select('v2', { force: true });
      } else if (textV2) {
        cy.wrap($sel).select(textV2, { force: true });
      } else {
        cy.log('No explicit v2 option found; relying on query param.');
      }
    });
  });

  cy.get('#choices', { timeout: 20000 }).should('be.visible');
});

// Start from a known state for a scenario (helper your spec can call)
// Expects your app to look at entry params or scenario picker
Cypress.Commands.add('bootScenario', (scenarioId) => {
  // Clear any old state
  cy.clearLocalStorage();

  // Land on the app root (with v2 hint)
  cy.visit('/?mode=v2');

  // Make sure v2 mode is on
  cy.ensureV2Mode();

  // If your app supports selecting via the picker, do it (without .catch)
  cy.get('body').then(($body) => {
    const hasPicker = $body.find('#scenarioPicker').length > 0;
    if (!hasPicker) {
      cy.log('No #scenarioPicker found; assuming app auto-loads the scenario.');
      return;
    }

    cy.get('#scenarioPicker', { timeout: 20000 }).then(($sel) => {
      const el = $sel[0];
      const opts = Array.from(el.options);
      const labels = opts.map((o) => (o.text || '').trim() || o.value);
      cy.log(`Scenario options: [${labels.join(' | ')}]`);

      const labelGuess = scenarioId.replace(/-/g, ' ').trim();
      const hasByValue = opts.some((o) => (o.value || '').includes(scenarioId));
      const hasByExactLabel = opts.some((o) =>
        (o.text || '').trim().toLowerCase() === labelGuess.toLowerCase()
      );

      if (hasByValue) {
        cy.wrap($sel).select(scenarioId, { force: true });
      } else if (hasByExactLabel) {
        cy.safeSelect('#scenarioPicker', labelGuess);
      } else {
        cy.log(`Scenario "${scenarioId}" not found by value or label; proceeding anyway.`);
      }
    });
  });

  // Wait for first choices to appear
  cy.waitForChoices(1);
});

// Find (but don't click) a choice by label (string/regex) or by index
Cypress.Commands.add('findChoice', (target) => {
  cy.get('#choices', { timeout: 20000 }).should('be.visible');

  if (typeof target === 'number') {
    const idx = target >= 1 ? target - 1 : target; // allow 1-based
    return cy.get('#choices').find('button, [role="button"]', { timeout: 20000 }).eq(idx);
  }

  const matcher = target instanceof RegExp ? target : new RegExp(`^\\s*${target}\\s*$`, 'i');

  return cy.get('#choices').find('button, [role="button"]', { timeout: 20000 })
    .filter((_, el) => matcher.test(el.innerText || el.textContent || ''));
});

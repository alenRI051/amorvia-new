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
    cy.get('#choices').find('button, [role="button"]', { timeout: 20000 })
      .eq(idx)
      .click({ force: true });
    return;
  }

  // String or RegExp label
  const matcher = target instanceof RegExp ? target : new RegExp(`^\\s*${target}\\s*$`, 'i');

  cy.get('#choices').find('button, [role="button"]', { timeout: 20000 })
    .should('have.length.greaterThan', 0)
    .then(($btns) => {
      const idx = Cypress.$.makeArray($btns).findIndex((el) => matcher.test(el.innerText || el.textContent || ''));
      expect(idx, `button matching ${matcher}`).to.be.gte(0);
      cy.wrap($btns[idx]).click({ force: true });
    });
});

// Safe select by visible text or value (no .catch on Cypress chains!)
Cypress.Commands.add('safeSelect', (selector, target, options = {}) => {
  cy.get(selector, { timeout: 20000 }).should('be.visible').then($sel => {
    const el = $sel[0];
    const opts = Array.from(el.options);
    const hasByText  = opts.some(o => (o.text || '').trim().match(new RegExp(`^${target}$`, 'i')));
    const hasByValue = opts.some(o => (o.value || '').trim() === target);

    // debug dump
    const available = opts.map(o => o.text.trim() || o.value).join(' | ');
    cy.log(`safeSelect("${selector}", "${target}") available: [${available}]`);

    if (!hasByText && !hasByValue) {
      throw new Error(`Option "${target}" not found in ${selector}`);
    }

    // force helps in headless / overlay cases
    cy.wrap($sel).select(target, { force: true, ...options });
  });
});

// Force UI into v2 mode so `.v2-only` content (choices, HUD) is visible
Cypress.Commands.add('ensureV2Mode', () => {
  // If the app respects ?mode=v2, we also visit with that query param (harmless if ignored)
  cy.location().then((loc) => {
    if (!/\bmode=v2\b/.test(loc.search)) {
      cy.visit(`/?mode=v2`);
    }
  });

  cy.get('#modeSelect', { timeout: 20000 }).then(($sel) => {
    // In case the app uses a select to switch modes, set it explicitly
    const hasV2Option = Array.from($sel[0].options).some((o) => /v2/i.test(o.value) || /Branching v2/i.test(o.text));
    if (hasV2Option) {
      cy.wrap($sel).select('v2', { force: true }).catch(() => {
        cy.wrap($sel).select('Branching v2', { force: true });
      });
    }
  });

  // Assert v2-only area becomes visible
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

  // If your app supports selecting via the picker, do it.
  // Otherwise, if your app picks the first scenario by default,
  // you can skip this and rely on the app’s own auto-boot.
  cy.get('#scenarioPicker', { timeout: 20000 }).then(($sel) => {
    const hasScenario = Array.from($sel[0].options).some((o) =>
      (o.value || '').includes(scenarioId) || (o.text || '').toLowerCase().includes(scenarioId.replace(/-/g, ' '))
    );

    if (hasScenario) {
      cy.wrap($sel).select(scenarioId, { force: true }).catch(() => {
        // fallback: try selecting by visible text
        cy.wrap($sel).select(scenarioId.replace(/-/g, ' '), { force: true });
      });
    }
  });

  // Wait for first choices to appear
  cy.waitForChoices(1);
});


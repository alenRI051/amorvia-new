/// <reference types="cypress" />

/**
 * TEMPLATE SCENARIO SPEC (baseline)
 * ---------------------------------
 * How to use:
 * 1) Duplicate this file and rename it for your scenario, e.g.:
 *      cp cypress/e2e/_template_scenario_passed.cy.js \
 *         cypress/e2e/co_parenting.cy.js
 * 2) Change SCENARIO_ID and the describe() title below.
 * 3) Update each Path test's click sequence (by index) to walk a full ending.
 *
 * Notes:
 * - We prefer stable-by-index clicks to avoid brittle text matching.
 * - We assert that dialog text is non-empty after each step (copy-agnostic).
 * - Keep the first click as “Continue” (index 1) if your app shows it first.
 */

const SCENARIO_ID = 'REPLACE_ME_SCENARIO_ID'; // e.g. 'dating-after-breakup-with-child-involved'

// Helper: dialog should have some text (copy-agnostic)
const expectDialogNotEmpty = () => {
  cy.get('#dialog', { timeout: 20000 })
    .should('be.visible')
    .invoke('text')
    .then((t) => t.trim())
    .should('have.length.greaterThan', 0);
};

// Helper: click the first screen's "Continue", then wait for next set
const bootAndContinue = () => {
  cy.bootScenario(SCENARIO_ID);   // clears storage, visits /?mode=v2, selects scenario, waits for first choices
  cy.clickChoice(1);              // usually "Continue"
  cy.waitForChoices(1);           // next screen (min 1; adjust to 2/3 if your scenario always has >1)
};

describe('REPLACE ME: Scenario Title', () => {

  beforeEach(() => {
    // Nothing else needed — boot per test for isolation
  });

  it('Path A → ENDING LABEL', () => {
    bootAndContinue();

    // --- Example sequence (adjust indexes to your scenario) ---
    // Step 1 choices (min 3 expected, if applicable)
    cy.waitForChoices(3);
    cy.clickChoice(1); // pick first option
    expectDialogNotEmpty();

    // Step 2
    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    // Step 3 (finalize / finish)
    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    // HUD sanity (optional)
    cy.get('#hud').should('exist');
  });

  it('Path B → ENDING LABEL', () => {
    bootAndContinue();

    // --- Example sequence (adjust indexes to your scenario) ---
    cy.waitForChoices(3);
    cy.clickChoice(2); // pick second option
    expectDialogNotEmpty();

    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    cy.get('#hud').should('exist');
  });

  it('Path C → ENDING LABEL', () => {
    bootAndContinue();

    // --- Example sequence (adjust indexes to your scenario) ---
    cy.waitForChoices(3);
    cy.clickChoice(3); // pick third option
    expectDialogNotEmpty();

    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    cy.waitForChoices(1);
    cy.clickChoice(1);
    expectDialogNotEmpty();

    cy.get('#hud').should('exist');
  });

});

// cypress/e2e/dating_after_breakup.cy.js

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Small helper to dump current choices (both to Cypress UI and terminal)
function logChoices(label = 'Choices now') {
  cy.get('#choices', { timeout: 20000 }).then(($wrap) => {
    const texts = [...$wrap.find('button, [role="button"]')].map(el =>
      (el.textContent || '').trim().replace(/\s+/g, ' ')
    );
    const line = `${label}: [${texts.join(' | ')}]`;
    cy.log(line);
    cy.task('log', line);
  });
}

describe('Dating After Breakup (With Child Involved)', () => {
  beforeEach(() => {
    cy.task('log', '===== beforeEach start =====');
    cy.clearLocalStorage();
    cy.visit('/');
    cy.task('log', 'Visited /');

    // Boot scenario (your custom command defined in support/commands.js)
    cy.bootScenario(SCENARIO_ID);
    cy.task('log', `Booted scenario: ${SCENARIO_ID}`);

    cy.get('#dialog', { timeout: 20000 }).should('exist');
    cy.get('#choices', { timeout: 20000 }).should('exist');

    logChoices('Initial choices');
    cy.task('log', '===== beforeEach done =====');
  });

  it('Path A → Stable plan ending', () => {
    cy.task('log', 'Path A: looking for "neutral.*heads-up"');
    logChoices('Before Path A pick 1');

    cy.findChoice(/neutral.*heads-up/i).click(); // expect this to exist
    cy.task('log', 'Clicked: neutral, child-first heads-up');
    logChoices('After Path A pick 1');

    cy.task('log', 'Path A: looking for "finish"');
    logChoices('Before Finish');
    cy.findChoice(/finish/i).click();

    // If you have a custom assertion for endings, keep it:
    // cy.assertEnding(/Stable plan/i);
    cy.task('log', 'Path A complete (clicked Finish)');
  });

  it('Path B → Fragile truce ending', () => {
    cy.task('log', 'Path B: looking for "avoid the topic"');
    logChoices('Before Path B pick 1');

    cy.findChoice(/avoid the topic/i).click();
    cy.task('log', 'Clicked: Avoid the topic');
    logChoices('After Path B pick 1');

    cy.task('log', 'Path B: looking for "finish"');
    logChoices('Before Finish');
    cy.findChoice(/finish/i).click();

    // cy.assertEnding(/Fragile truce/i);
    cy.task('log', 'Path B complete (clicked Finish)');
  });

  it('Path C → Separate lanes ending', () => {
    cy.task('log', 'Path C: looking for "share lots of details"');
    logChoices('Before Path C pick 1');

    cy.findChoice(/share lots of details/i).click();
    cy.task('log', 'Clicked: Share lots of details');
    logChoices('After Path C pick 1');

    cy.task('log', 'Path C: looking for "finish"');
    logChoices('Before Finish');
    cy.findChoice(/finish/i).click();

    // cy.assertEnding(/Separate lanes/i);
    cy.task('log', 'Path C complete (clicked Finish)');
  });
});

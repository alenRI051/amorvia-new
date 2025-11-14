// cypress/e2e/dating_after_breakup_pathA.cy.js

const SCENARIO_ID = 'dating-after-breakup-with-child-involved';

// Path A: placeholder niz izbora po koracima.
// Svaki broj je index gumba (0 = prvi, 1 = drugi, ...)
// Kasnije slobodno prilagodi ovo stvarnom "Stable plan" pathu.
const PATH_A = [0, 0, 1, 0, 0, 1, 0];

describe('Dating After Breakup (With Child Involved) – Path A stable ending', () => {
  it('follows Path A without crashing and keeps dialog alive', () => {
    cy.visitScenario(SCENARIO_ID);
    cy.expectDialogHasText();

    PATH_A.forEach((choiceIndex, stepNo) => {
      cy.log(`Path A step ${stepNo + 1} – choice index ${choiceIndex}`);

      cy.get('body').then(($body) => {
        const buttons = $body.find('[data-testid="choices"] button');

        expect(
          buttons.length,
          `step ${stepNo + 1}: must have at least ${choiceIndex + 1} choices`
        ).to.be.greaterThan(choiceIndex);

        // klikni odgovarajući choice
        cy.wrap(buttons.eq(choiceIndex)).click();

        // nakon klika i dalje mora postojati neki tekst u dialogu
        cy.expectDialogHasText();
      });
    });

    // nakon Path A sekvence, dopuštamo da:
    // - ili više nema izbora (kraj scenarija)
    // - ili ima, ali test završava bez crasha
    cy.get('body').then(($body) => {
      const buttons = $body.find('[data-testid="choices"] button');
      cy.log(`After Path A, remaining choices: ${buttons.length}`);
    });
  });
});

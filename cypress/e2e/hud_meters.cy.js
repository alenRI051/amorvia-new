// cypress/e2e/hud_meters.cy.js

const SCENARIO_ID = 'co-parenting-with-bipolar-partner';

function metersChanged(before, after) {
  const keys = ['trust', 'tension', 'childStress'];

  return keys.some((k) => {
    const a = before?.[k];
    const b = after?.[k];
    return typeof a === 'number' && typeof b === 'number' && a !== b;
  });
}

describe('HUD meters – respond to choices', () => {
  it('eventually changes at least one meter after several choices', () => {
    cy.visitScenario(SCENARIO_ID);
    cy.expectDialogHasText();

    let initialMeters;

    // uzmi početne vrijednosti metara iz mini-engine stanja
    cy.window()
      .its('AmorviaMini.state.meters')
      .should('exist')
      .then((meters) => {
        initialMeters = { ...meters };
        cy.log('Initial meters:', JSON.stringify(initialMeters));
      })
      .then(() => {
        // helper koji klika kroz nekoliko koraka dok se nešto ne promijeni
        function clickUntilChanged(step = 0, maxSteps = 8) {
          if (step >= maxSteps) {
            throw new Error(`Meters did not change after ${maxSteps} steps`);
          }

          cy.get('body').then(($body) => {
            const buttons = $body.find('[data-testid="choices"] button');

            expect(
              buttons.length,
              `step ${step + 1}: must have at least one choice to drive meters`
            ).to.be.greaterThan(0);

            cy.wrap(buttons.eq(0)).click(); // za sada klikamo prvi choice

            cy.window()
              .its('AmorviaMini.state.meters')
              .then((currentMeters) => {
                const changed = metersChanged(initialMeters, currentMeters);

                cy.log(
                  `Step ${step + 1} meters:`,
                  JSON.stringify(currentMeters),
                  'changed =',
                  changed
                );

                if (!changed) {
                  // još uvijek ista slika – probaj dalje
                  clickUntilChanged(step + 1, maxSteps);
                } else {
                  expect(
                    changed,
                    `At least one HUD meter changed within ${step + 1} steps`
                  ).to.be.true;
                }
              });
          });
        }

        clickUntilChanged(0, 8);
      });
  });
});

// cypress/e2e/hud_meters.cy.js

// This spec focuses on one scenario + path where we know
// the very first real choice has meter effects.
// It gives us a clean, deterministic check that the HUD
// responds to choices.

describe('HUD meters – respond to choices', () => {
  it('updates at least one meter after a concrete choice', () => {
    // 1) Load a scenario with guaranteed meter effects on the first real choice
    cy.visitScenario('dating-after-breakup-with-child-involved');

    // 2) From the scenario menu, click "Continue" into the first content node (a1s1)
    cy.contains('button, a', /continue/i).click();

    // 3) Make sure the HUD is actually present
    cy.getHudMeters().should('have.length.at.least', 1);

    // Helper: take a snapshot of current HUD meter "values"
    const takeHudSnapshot = () =>
      cy.getHudMeters().then(($meters) => {
        const values = [];
        $meters.each((_, el) => {
          const attrValue =
            el.getAttribute('data-value') ||
            (el.style && el.style.width) ||
            (el.textContent || '').trim();

          values.push(attrValue);
        });
        return values;
      });

    // 4) Snapshot meters before any choice
    takeHudSnapshot().then((before) => {
      // 5) Click the first choice in this node
      // (for a1s1 both choices carry meter effects, so whichever we choose
      //  should adjust at least one meter)
      cy.getChoiceButtons().first().click();

      // 6) Snapshot meters after the choice and compare
      takeHudSnapshot().then((after) => {
        expect(
          after,
          'HUD meter snapshot should change after one meaningful choice'
        ).to.not.deep.equal(before);
      });
    });
  });
});

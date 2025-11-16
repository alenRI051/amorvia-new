// cypress/e2e/hud_meters.cy.js

describe('HUD meters – respond to choices', () => {
  it('updates at least one meter after a concrete choice in a HUD-enabled scenario', () => {
    // Use a scenario we know has non-zero meter effects on the first choice
    cy.visitScenario('dating-after-breakup-with-child-involved');

    // Make sure the scenario actually started and dialog is visible
    cy.expectDialogHasText();

    // Assert that HUD meters are present for this scenario
    cy.getHudMeters().should('have.length.at.least', 1);

    // Helper to snapshot HUD meter values in a robust way
    const snapshotMeters = () =>
      cy.getHudMeters().then($meters => {
        const values = [];

        $meters.each((_, el) => {
          // Prefer a data-value attribute if you expose one
          const valueAttr = el.getAttribute('data-value');
          if (valueAttr != null) {
            values.push(valueAttr);
            return;
          }

          // Fallback to style width (common for bar meters)
          if (el.style && el.style.width) {
            values.push(el.style.width);
            return;
          }

          // Final fallback: text content
          values.push((el.textContent || '').trim());
        });

        return values;
      });

    let beforeValues;

    // Take initial snapshot
    cy.then(() => {
      return snapshotMeters().then(vals => {
        beforeValues = vals;
      });
    });

    // Click the first available choice on the current node
    cy.getChoiceButtons()
      .should('have.length.at.least', 1)
      .first()
      .click();

    // Give the UI a tiny moment to update (in case of animations)
    cy.wait(200);

    // Take snapshot after the choice and assert change
    cy.then(() => {
      return snapshotMeters().then(afterValues => {
        expect(
          afterValues,
          'HUD meter values should change after a meaningful choice'
        ).to.not.deep.equal(beforeValues);
      });
    });
  });
});


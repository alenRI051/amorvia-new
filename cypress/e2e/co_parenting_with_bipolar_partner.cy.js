/// <reference types="cypress" />

describe('Co-Parenting with Bipolar Partner — basic flow', () => {
  const ID_VALUE = 'co-parenting-with-bipolar-partner';
  const TITLE_RE = /co-parenting with bipolar partner/i;

  it('loads at Act 1 / a1s1 and continues into Act 2 / a2s1', () => {
    cy.visit('http://localhost:3000');
    cy.viewport(1280, 900);
    cy.clearLocalStorage();

    // ---- Pick scenario via <select> (preferred) ----
    cy.get('select, select[name], [data-cy="scenario-select"]', { timeout: 10000 })
      .first()
      .then(($sel) => {
        const options = Array.from($sel[0].options).map((o) => ({ v: o.value, t: o.text }));
        const hasValue = options.some((o) => o.v === ID_VALUE);
        const hasText = options.some((o) => TITLE_RE.test(o.t));

        if (hasValue) {
          cy.wrap($sel).select(ID_VALUE, { force: true });
        } else if (hasText) {
          const textLabel = options.find((o) => TITLE_RE.test(o.t)).t;
          cy.wrap($sel).select(textLabel, { force: true });
        } else {
          // Fallback: some UIs use buttons instead
          cy.contains('button, [role="button"]', TITLE_RE).click({ force: true });
        }
      });

    // Optional “Start” button guard (click if present)
    cy.get('body', { timeout: 5000 }).then(($b) => {
      if ($b.find('button, [role="button"]').filter((i, el) => /start/i.test(el.textContent || '')).length) {
        cy.contains(/start/i).click({ force: true });
      }
    });

    // ---- Branch based on first screen ----
    cy.get('body', { timeout: 10000 }).then(($b) => {
      const txt = $b.text();
      const atFirstStep = /handover day\.?\s+your co-parent looks tired but alert/i.test(txt);
      const atAct1End  = /end of act 1/i.test(txt);

      if (atFirstStep) {
        cy.contains(/answer briefly and ask about medication schedule/i).click();
        cy.contains(/confirm pickup time for sunday/i).should('be.visible');
        cy.contains(/confirm details clearly and thank them/i).click();
        cy.contains(/end of act 1/i).should('be.visible');
      } else if (atAct1End) {
        cy.contains(/end of act 1/i).should('be.visible');
      } else {
        throw new Error('Expected either the first step text or "End of Act 1", but saw neither.');
      }
    });

    // ---- Continue into Act 2 ----
    cy.contains(/continue to act 2/i, { timeout: 5000 }).click();
    cy.contains(/brief weekly check-in/i, { timeout: 10000 }).should('be.visible');
  });
});

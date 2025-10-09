/// <reference types="cypress" />

describe('Co-Parenting with Bipolar Partner — basic flow', () => {
  const TITLE_RE = /co-parenting with bipolar partner/i;

  it('loads at Act 1 / a1s1 and continues into Act 2 / a2s1', () => {
    cy.visit('http://localhost:3000');
    cy.clearLocalStorage();

    // Open scenario by menu title
    cy.contains(TITLE_RE, { timeout: 10000 }).click();

    // If your UI has a Start button, click if present (safe, non-failing check)
    cy.get('body', { timeout: 5000 }).then(($b) => {
      if ($b.text().match(/^\s*start\s*$/im)) {
        cy.contains(/^start$/i).click({ force: true });
      }
    });

    // Branch on what we see first
    cy.get('body', { timeout: 10000 }).then(($b) => {
      const txt = $b.text();

      const atFirstStep = /handover day\.?\s+your co-parent looks tired but alert/i.test(txt);
      const atAct1End  = /end of act 1/i.test(txt);

      if (atFirstStep) {
        // Normal path through Act 1
        cy.contains(/answer briefly and ask about medication schedule/i).click();
        cy.contains(/confirm pickup time for sunday/i).should('be.visible');
        cy.contains(/confirm details clearly and thank them/i).click();
        cy.contains(/end of act 1/i).should('be.visible');
      } else if (atAct1End) {
        // Already at Act 1 end — just proceed
        cy.contains(/end of act 1/i).should('be.visible');
      } else {
        throw new Error('Expected either the first step text or "End of Act 1", but saw neither.');
      }
    });

    // Continue into Act 2 and assert we’re there
    cy.contains(/continue to act 2/i, { timeout: 5000 }).click();
    cy.contains(/brief weekly check-in/i, { timeout: 10000 }).should('be.visible');
  });
});


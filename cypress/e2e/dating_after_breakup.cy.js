/// <reference types="cypress" />

const SCENARIO_ID = "dating-after-breakup-with-child-involved";
const SCENARIO_URL = new RegExp(`public\\/data\\/${SCENARIO_ID}\\.v2\\.json.*`);

describe("Dating After Breakup (With Child Involved)", () => {
  beforeEach(() => {
    cy.intercept("GET", SCENARIO_URL).as("scenario");
    cy.visit(`/?mode=v2&scenario=${SCENARIO_ID}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem("amorvia:mode", "v2");
        win.localStorage.setItem("amorvia:scenario", SCENARIO_ID);
      },
    });
    cy.wait("@scenario");
    cy.get("body").should("have.class", "v2");
    cy.get("#dialog").should("be.visible");
    cy.get("#choices.choices.row.v2-only").should("be.visible");
    cy.get("#choices .choice").should("have.length.at.least", 1);
  });

  it("Path A → Stable plan ending", () => {
    // a1s1 -> pick first choice
    cy.get("#choices .choice").first().click();

    // a1s2 appears; ensure choices visible
    cy.get("#dialog").should("be.visible");
    cy.get("#choices .choice").should("have.length.at.least", 1).first().click();

    // advance to a1s3 then a1s4 then a1end
    cy.get("#choices .choice").first().click();
    cy.get("#choices .choice").first().click();

    // “Continue to Act 2.”
    cy.contains("#choices .choice", /Continue to Act 2/i).click();
    cy.contains("#choices .choice", /^Continue$/i).click(); // bridge node

    // Now in act2s1 (assert we still have choices)
    cy.get("#choices .choice").should("have.length.at.least", 1);
  });
});


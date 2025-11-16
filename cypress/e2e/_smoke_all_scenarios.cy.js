// Thin compatibility wrapper so Husky's pre-commit can still run
// a full scenario smoke test without changing scripts.
//
// It simply imports and executes the existing scenario smoke suite.

import './scenario_smoke.cy.js';

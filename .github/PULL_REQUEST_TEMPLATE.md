## 🧩 Summary

<!-- Briefly describe what this PR does -->
- [ ] Feature / Scenario update
- [ ] Bug fix
- [ ] Tooling or CI improvement
- [ ] Documentation or meta change

---

## ✅ Changes

- [ ] Scenario JSONs updated (`public/data/*.v2.json`)
- [ ] Schema validated via `npm run lint:schemas`
- [ ] Local smoke tests (`npm run test:e2e:spec -- cypress/e2e/_smoke_all_scenarios.cy.js`)
- [ ] Passes Husky pre-commit hook
- [ ] CI (GitHub Actions) passing

---

## 🧠 Context & Motivation

<!-- Explain *why* this change was made or what issue/scenario it addresses -->
<!-- Example: Added Act 4 for “Dating After Breakup” to complete the beta scenario set. -->

---

## 🧪 Verification Steps

1. Run:
   ```bash
   npm run convert:v2
   npm run lint:schemas
   npm run test:e2e

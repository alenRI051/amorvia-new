# 📘 CHANGELOG — Amorvia

## [0.9.2] — 2025-11-28
### Added
- UI Polish 9.8.x series (9.8.1–9.8.4)
  - Stage fade-in, dialog rise-in, soft transitions
  - Character “breathing” micro-animation (accessibility-safe)
  - Improved readability across all scenarios
  - HUD polish: clearer chips, better layout, mobile wrap
  - Compact UI & mobile UX improvements

### Changed
- Cleaned and optimized entire `public/js` and `public/css` directories
- Removed >70 legacy scripts (HUD 9.3–9.7.1, old toggles, old domfixes)
- Simplified bootstrap pipeline (removed obsolete extras-tabs import)
- Removed deprecated root `index.html` (public/index.html is canonical)
- Improved scenario loading and SW cache layering

### Fixed
- All console errors removed
- No more 404 (`extras-tabs.js`)
- No more Service Worker `addAll()` failures
- No stray scenario files or invalid JSON
- HUD contrast for bright/dark backgrounds
- Animation pipeline compatible with `prefers-reduced-motion`

### Internal
- Full Cypress smoke test now consistently green (100% pass)
- Repo in “production-safe” state, ready for scenario polish phase
- Future Extras/Labs moved to backlog for v0.10.x
- Added structure notes to README.md

---

## [0.9.1] — Pre-release
- All scenarios upgraded to v2 JSON format
- v2-index.json stabilized
- HUD 9.7 introduced
- Engine patching cleanup
- Initial scenario linking audit

---

## [0.9.0] — Scenario Engine v2 baseline
- Complete migration from v1 → v2 engine
- New meters system (trust/tension/childStress)
- New node/step architecture
- Full JSON schema validation added

Contributing to Amorvia

Thanks for helping build Amorvia! This guide explains how to set up your environment, the data/schema rules, how we test, and our commit/PR workflow.

Table of contents

Prerequisites

Quick start

Project scripts

Schema & data model (v2)

Writing scenarios

Testing

Commit & PR workflow

CI

Conventional commits

Troubleshooting

Prerequisites

Node.js 22.x (CI runs on 22)

npm (ships with Node)

macOS, Linux, or Codespaces

Tip: in Codespaces, everything below “Quick start” should just work.

Quick start
# install dependencies (clean slate)
npm ci

# optional: one-time dev setup (http-server, etc)
npm run setup:dev

# run schema conversion + lint (validates all v2 files)
npm run fix:schemas    # alias for convert + lint

# run the smoke e2e
npm run test:e2e:spec -- cypress/e2e/_smoke_all_scenarios.cy.js


We use Husky pre-commit hooks. On commit, the hook will:

convert JSON to v2, 2) lint schemas (AJV), 3) run the repo-wide smoke check.

If your commit fails, fix the reported errors and commit again.

Project scripts
# validate all v2 scenario jsons against the schema
npm run lint:schemas

# CI-friendly validator (used in GitHub Action)
npm run lint:schemas:ci

# v2 structure checks/fixes (tools)
npm run convert:v2
npm run convert:v2:dry

# content tools (effects, hints, neutral fills)
npm run choices:scan
npm run choices:hint
npm run choices:hint:write
npm run choices:neutral
npm run choices:neutral:write

# e2e tests
npm run test:e2e               # all e2e with Electron
npm run test:e2e:spec -- <spec>
npm run test:e2e:open          # interactive (xvfb in CI)

# quick CI-like lane used by Husky/CI
npm run ci:lean                # lint + repo-wide smoke

Schema & data model (v2)

All scenarios live in public/data/*.v2.json

Must validate against public/schema/scenario.v2.schema.json

Required top-level fields:

id (string), title (string), version: 2, meters (object), acts (array)

Allowed meters: trust, tension, childStress

Choice effects must use only these meters

Each delta must be within -2 … +2 (schema and tests enforce this)

Acts/steps

acts[].id unique

acts[].steps[] is an array

each step has id, display text (one of text|label|prompt|title|description|desc), and choices[] (min 2)

each choice has id, label, to, effects (object of deltas)

to can point to a step id, an act id (jump to act’s first step), or "menu" (terminal)

Converters & fixers

npm run convert:v2 makes sure old/loose formats meet v2 shape.

npm run fix:display-text (and the fix pass bundled in CI lanes) ensures every step has a display text field.

Writing scenarios

Put your file in public/data/<scenario-name>.v2.json

Use globally unique step ids (e.g., a1s1, a1s2, a2s1, …)

Provide 2+ choices per step, with human-readable label

Use only the allowed meters with deltas in [-2, 2]

Use "menu" for terminal nodes or jump to another step/act by id

Keep narrative strings concise; long text goes in text/description

Before committing:

npm run convert:v2
npm run lint:schemas
npm run test:e2e:spec -- cypress/e2e/_smoke_all_scenarios.cy.js

Testing
Smoke (repo-wide)

Catches common issues across all scenarios:

npm run test:e2e:spec -- cypress/e2e/_smoke_all_scenarios.cy.js

Full validation for the main scenario
npm run test:e2e:spec -- cypress/e2e/dating_after_breakup_full.cy.js


This suite checks:

top-level fields and version: 2

choice to pointers resolve

only known meters with safe deltas

graph reachability (non-first steps must be referenced)

random playthrough keeps cumulative meters clamped

Run all e2e
npm run test:e2e


In CI we use Electron headless. Local interactive (open) is supported as well.

Commit & PR workflow
Pre-commit hook (Husky)

On each commit we run:

convert:v2 → lint:schemas → smoke e2e


If any step fails, the commit aborts.

We intentionally do not call the legacy husky.sh. The repo uses a no-bootstrap script and core.hooksPath is set to .husky/.

Conventional commits

Use prefixes like:

feat: … new content/tools

fix: … bug/data fix

chore: … tooling, deps, CI

docs: … docs only

test: … tests

PR template

When you open a PR, GitHub pre-populates a checklist (tests, schema validation, scenario notes). Please keep it up to date.

CI

We run GitHub Actions on every push/PR:

Node 22 with npm cache

convert:v2, lint:schemas

Cypress (Electron headless) on selected specs

Branch protection is recommended so main only accepts CI-green PRs.

Troubleshooting

AJV not found

Ensure devDependencies are installed: npm ci

Use the provided scripts (they resolve the local binary)

Cypress DBus warnings (Electron)

You may see Failed to connect to the bus… in headless Linux — it’s harmless in our setup.

“glob does not provide default export”

We use import { glob } from 'glob' (ESM). If you write tools, prefer named import.

Husky deprecation warning

Don’t source husky.sh. Our .husky/pre-commit is self-contained. If you see the warning, remove:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"


Pre-commit takes too long

Use npm run ci:lean locally for quick checks.

If you’re iterating, commit smaller chunks or run scripts directly.

Branch is behind remote

git fetch origin
git rebase origin/main
git push --force-with-lease

Questions?

Open an issue or start a discussion in the repo. Happy building! 💛

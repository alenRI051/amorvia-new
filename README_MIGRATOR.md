# Amorvia Scenario Migrator

This tool converts simple Markdown files into the `data/scenarios.json` format used by Amorvia's multi‑act engine.

## Folder structure
```
tools/
  migrate.js
  content/
    example-boundaries.md
    (put your own .md files here)
```

## Markdown format (keep it simple)
```
# Scenario Title

## Act 1 — Name (optional)
- First step line of dialogue or narration
- Another step
- You can mix narration and spoken lines

## Act 2 — Optional Name
- Step 1
- Step 2
```

- `#` = Scenario title (required)
- `##` = Act headers (required for each act)
- `-` list items inside each act become steps in order

## Run (Node.js required)
From repo root (or from `tools` folder):

```bash
# install once (if needed)
node -v

# run the migrator
node tools/migrate.js
```

This will generate/update: `data/scenarios.json` in your repo root.

## Tip
- Put one scenario per `.md` file in `tools/content/`.
- Files are processed alphabetically; each file becomes one scenario entry.
- You can re-run safely; it overwrites `data/scenarios.json`.

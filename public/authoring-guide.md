# Amorvia Scenario Authoring Guide (v2)

## Files
- Put scenarios in `public/data/{id}.v2.json`.
- Add `{ "id": "{id}", "title": "..." }` to `public/data/v2-index.json`.

## Structure
- `version` must be `2`.
- Each scenario has `meters` (optional) and an array of `acts`.
- Each act has `id`, `title`, `start`, and `nodes`.
- Node types:
  - `line`: `{ id, type: "line", text, next }`
  - `choice`: `{ id, type: "choice", prompt, choices: [ { label, to, effects? } ] }`
  - `end`: `{ id, type: "end", summary? }`

## Effects
- In `effects`, keys are meter ids, values are numbers to add (can be negative).
- Engine clamps values to `min..max` from `meters` config.

## Tips
- Keep choices clear and concrete.
- Typically keep deltas in the range -20..+20.
- Use one short idea per line; keep reading friction low.

## Validate
Run the validator (CI does this automatically):
```bash
cd tools/validator
npm ci
npm run validate
```

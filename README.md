# Amorvia Convenience + Expanded Scenario Bundle

## What you get
1. **Expanded scenario**: `public/data/dating-after-breakup-with-child-involved.v2.json`  
   - v2 schema compliant (`version: 2`, `line|choice|goto|end`, `to` transitions)  
   - Includes micro-scenes: *ex jealousy ping* and *child bedtime regression*.

2. **Convenience npm script**
   - `package-scripts-snippet.json` with:
     ```json
     {
       "scripts": {
         "fix:schemas": "node tools/migrate-steps-to-nodes.v2.mjs && node tools/normalize-text-and-ids.mjs && node tools/ensure-min-choices.v2.mjs && node tools/one-shot-fix.mjs && node tools/add-missing-node-ids.mjs",
         "lint:schemas": "node validator.mjs",
         "lint:schemas:ci": "node validator.mjs --ci"
       }
     }
     ```

## How to apply

1. **Copy the scenario file** into your repo:
   - `public/data/dating-after-breakup-with-child-involved.v2.json`

2. **Add the npm scripts** to your `package.json` under the `"scripts"` section.
   - Merge the keys from `package-scripts-snippet.json`.
   - Optionally add a pre-commit hook to run `npm run lint:schemas`.

3. **(Optional) Verify fix tools exist**
   ```bash
   node tools/check-fix-tools.js
   ```

4. **Use the convenience script**
   ```bash
   npm run fix:schemas
   npm run lint:schemas
   ```

## Notes
- If you want meter deltas tracked, we can attach sidecar rules in your engine or annotate choice labels (e.g., `[Trust +5]`) per your UX preference.

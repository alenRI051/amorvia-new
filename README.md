# Amorvia Schema Lint Kit

Validates all scenario files against your v2 schema.

## Requirements
- Node.js 18+
- Your repo structure:
  - `public/schema/scenario.v2.schema.json`
  - `public/data/*.v2.json`

## Install
```bash
npm i
```

## Run locally
```bash
npm run lint:schemas
```
- Shows each file and any validation issues.

## CI-friendly (minimal output, nonzero exit on fail)
```bash
npm run lint:schemas:ci
```

## Tips
- The validator uses Ajv 8 with `strict:false` and `allowUnionTypes:true` to match your existing Ajv CLI flags.
- If your schema uses `$ref`, make sure all referenced files are reachable from `public/schema/scenario.v2.schema.json` via relative paths.

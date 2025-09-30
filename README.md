# Amorvia Schema Lint Kit (v2)

Fixes the 2020-12 meta-schema error by using Ajv's 2020 class automatically when your schema declares
`$schema: "https://json-schema.org/draft/2020-12/schema"`.

## Install
```bash
npm i
```

## Run
```bash
npm run lint:schemas        # verbose
npm run lint:schemas:ci     # CI mode
```

## Notes
- Uses `ajv-formats` for common string formats.
- Auto-selects Ajv (draft-07) or Ajv2020 based on your schema's `$schema` field.

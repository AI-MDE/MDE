# Generate DAL

| Field | Value |
|-------|-------|
| `name` | `generate_dal` |
| `phase` | development |
| `intent` | generate |
| `ai` | `none` |

---

## Calls

- dal_generation

## Requires

- ../../configuration.json
- ../../design/modules/dal/dal-*.json
- ../../design/modules/dal/*/schema.json

## Produces

- ../../src/dal/*.ts
- ../../src/services/*.ts
- ../../src/dal/*.test.js
- ../../src/services/*.test.js

## Tools

- file_manager

## Rules

- Generate DAL code from module schema definitions
- Use raw SQL and TypeScript Node.js runtime

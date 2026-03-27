# dal_generation

| Field | Value |
|-------|-------|
| `name` | `dal_generation` |
| `next_phase` | development |

---

## Purpose

Generate TypeScript DAL modules using raw SQL from DAL specs

## Inputs

- ../../configuration.json
- ../../design/modules/dal/dal-*.json
- ../../design/modules/dal/*/schema.json

## Outputs

- ../../src/dal/*.ts
- ../../src/services/*.ts
- ../../src/dal/*.test.js
- ../../src/services/*.test.js

## Rules

- Use raw SQL for queries
- Emit TypeScript for Node.js
- Avoid modifying non-DAL folders

## Tools Used

- file_manager

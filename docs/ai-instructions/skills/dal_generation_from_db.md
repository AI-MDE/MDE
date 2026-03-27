# dal_generation_from_db

| Field | Value |
|-------|-------|
| `name` | `dal_generation_from_db` |
| `next_phase` | development |

---

## Purpose

Generate TypeScript DAL modules using raw SQL from live DB schema

## Inputs

- ../../configuration.json
- .env (DATABASE_URL)
- ../../design/modules/dal/dal-*.json
- ../../design/modules/dal/*/schema.json

## Outputs

- ../../src/dal/*.ts

## Rules

- Introspect DB schema for columns and keys
- Use raw SQL for queries

## Tools Used

- file_manager

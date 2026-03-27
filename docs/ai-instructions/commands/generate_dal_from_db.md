# Generate DAL from DB

| Field | Value |
|-------|-------|
| `name` | `generate_dal_from_db` |
| `phase` | development |
| `intent` | generate |
| `ai` | `none` |

---

## Calls

- dal_generation_from_db

## Requires

- ../../configuration.json
- .env (DATABASE_URL)
- ../../design/modules/dal/dal-*.json
- ../../design/modules/dal/*/schema.json

## Produces

- ../../src/dal/*.ts

## Tools

- file_manager

## Rules

- Introspect live DB schema for columns and keys
- Use raw SQL and TypeScript Node.js runtime

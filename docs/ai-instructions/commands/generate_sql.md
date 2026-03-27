# Generate SQL Schema

| Field | Value |
|-------|-------|
| `name` | `generate_sql` |
| `phase` | design |
| `intent` | generate |
| `ai` | `none` |

---

## Requires

- ../../design/entities/ent-*.json

## Produces

- ../../design/sql/schema.sql
- ../../design/sql/schema-state.json
- ../../design/sql/alter-YYYY-MM-DD.sql

## Tools

- file_manager

## Rules

- First run writes schema.sql and schema-state.json — no alter file
- Subsequent runs diff against schema-state.json and write alter-YYYY-MM-DD.sql with only the changes
- Dropped tables and columns are commented out — never auto-applied
- Reads entity fields, indexes, and relationships from design/entities/ent-*.json
- Entity type mapping: uuid → UUID, string → VARCHAR(255), decimal → NUMERIC, datetime → TIMESTAMPTZ, enum → VARCHAR(50) with CHECK constraint

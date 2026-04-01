# Generate SQL Schema

| Field | Value |
|-------|-------|
| `name` | `generate_sql` |
| `phase` | design |
| `intent` | generate |
| `ai` | `none` |

---

## Tools

- file_manager

## Rules

- First run writes schema.sql and schema-state.json â€” no alter file
- Subsequent runs diff against schema-state.json and write alter-YYYY-MM-DD.sql with only the changes
- Dropped tables and columns are commented out â€” never auto-applied
- Reads entity fields, indexes, and relationships from design/entities/ent-*.json
- Entity type mapping: uuid â†’ UUID, string â†’ VARCHAR(255), decimal â†’ NUMERIC, datetime â†’ TIMESTAMPTZ, enum â†’ VARCHAR(50) with CHECK constraint

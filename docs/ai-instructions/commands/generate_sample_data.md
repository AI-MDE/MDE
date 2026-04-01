# Generate Sample Data

| Field | Value |
|-------|-------|
| `name` | `generate_sample_data` |
| `phase` | development |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- sample_data_generation

## Tools

- file_manager

## Rules

- Generate sample rows for every entity defined in the LDM
- Respect field types, required flags, and enum values from entity definitions
- **CRITICAL: Generate RFC 4122 v4 UUIDs for all ID fields** (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx, e.g., 550e8400-e29b-41d4-a716-446655440001)
- Use deterministic UUID generation per entity type (e.g., entities/ent-employee.json â†’ 550e8400 prefix, entities/ent-leave-type.json â†’ 660e8400 prefix)
- Honour referential integrity â€” FKs must point to IDs that exist in the generated data
- Seed LeaveType from entity seed_data values exactly
- Generate scripts/loadSeedData.js â€” a Node.js script that reads each output/sample-data/*.json file and INSERTs rows into the corresponding PostgreSQL table using pg
- loadSeedData.js must insert in dependency order: Employee â†’ LeaveType â†’ LeaveBalance â†’ LeaveRequest â†’ LeaveAuditEntry â†’ Notification
- loadSeedData.js must use parameterized queries only â€” no string interpolation of values
- loadSeedData.js must read DB connection config from environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- loadSeedData.js must load .env file using dotenv to read environment variables

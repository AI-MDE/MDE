# Generate Sample Data

| Field | Value |
|-------|-------|
| `name` | `generate_sample_data` |
| `phase` | development |
| `intent` | generate |
| `ai` | `none` |

---

## Calls

- sample_data_generation

## Requires

- ../../ba/data-model/logical-data-model.json
- ../../design/entities/*.json

## Produces

- ../../output/sample-data/*.json

## Tools

- file_manager

## Rules

- Generate sample rows for entities
- Respect field types and required flags

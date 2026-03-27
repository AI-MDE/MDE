# Generate ERD

| Field | Value |
|-------|-------|
| `name` | `generate_erd` |
| `phase` | governance |
| `intent` | generate |
| `ai` | `none` |

---

## Calls

- diagram_generation

## Requires

- ../../ba/data-model/logical-data-model.json

## Produces

- ../../output/docs/diagrams/erd.md

## Tools

- file_manager

## Rules

- Generate ERD directly from logical-data-model.json
- Do not invent entities or relationships

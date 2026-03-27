# Generate LDM

| Field | Value |
|-------|-------|
| `name` | `generate_ldm` |
| `phase` | system_design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- logical_data_model

## Requires

- ../../ba/requirements.md
- ../../ba/glossary.md
- ../../design/application_architecture.json

## Produces

- ../../ba/data-model/logical-data-model.json

## Tools

- file_manager
- json_validator

## Rules

- Use glossary terms as canonical names
- Do not invent entities with no business justification
- Map entities to owning modules where possible

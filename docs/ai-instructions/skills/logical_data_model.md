# logical_data_model

| Field | Value |
|-------|-------|
| `name` | `logical_data_model` |
| `next_phase` | module_definition |

---

## Purpose

Generate a logical data model grounded in requirements, glossary, and architecture

## Inputs

- ../../ba/requirements.md
- ../../ba/glossary.md
- ../../design/application_architecture.json

## Outputs

- ../../ba/data-model/logical-data-model.json

## Rules

- Use business vocabulary
- Separate conceptual entities from physical implementation
- Record ownership and relationships explicitly

## Tools Used

- file_manager
- json_validator

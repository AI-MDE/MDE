# logical_data_model

| Field | Value |
|-------|-------|
| `name` | `logical_data_model` |
| `next_phase` | module_definition |

---

## Purpose

Generate a logical data model grounded in requirements, glossary, and architecture

## Rules

- Use business vocabulary
- Separate conceptual entities from physical implementation
- Record ownership and relationships explicitly
- For each business-state entity, require lifecycle attribution fields (createdAt, createdByUserId, updatedAt, updatedByUserId). Keep decision actor attribution in immutable audit/history entries and do not add decision-specific actor columns on master entities.

## Tools Used

- file_manager
- json_validator

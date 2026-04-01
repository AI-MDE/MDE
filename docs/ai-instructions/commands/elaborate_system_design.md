# Elaborate System Design

| Field | Value |
|-------|-------|
| `name` | `elaborate_system_design` |
| `phase` | system_design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- physical_entity_identification
- system_design
- module_definition
- ui_module_definition
- diagram_generation

## Tools

- file_manager
- json_validator

## Rules

- Execute skills in strict order above
- Fail fast on the first failed checkpoint; do not run downstream skills on invalid or partial upstream outputs
- Do not invent requirements; all outputs must be traceable to requirements, business functions, and use cases
- All generated JSON artifacts must pass schema/structure validation before command completion

# Generate Module Catalog

| Field | Value |
|-------|-------|
| `name` | `generate_module_catalog` |
| `phase` | module_definition |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- module_definition

## Requires

- ../../design/entities/ent-*.json
- ../../design/application_architecture.json
- ../../ba/requirements.md

## Produces

- ../../design/modules/module-catalog.json

## Tools

- file_manager

## Rules

- Entity-driven modules: derive one module per entity file in design/entities/
- Non-entity modules: include all entries declared in application_architecture.json nonEntityModules
- Each module must have a declared purpose and owningModule
- No overlapping responsibilities
- Dependencies must be explicit and directional
- Use when identify_physical_entities has already been run

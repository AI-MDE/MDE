# Generate Module Definition

| Field | Value |
|-------|-------|
| `name` | `generate_module_definition` |
| `phase` | design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- module_definition

## Requires

- ../../design/modules/module-catalog.json
- ../../design/entities/ent-*.json
- ../../ba/requirements.md
- ../../mde/architecture/

## Produces

- ../../design/modules/{moduleType}/module-{kebab-module}.json
- ../../design/modules/{moduleType}/module-{kebab-module}.md

## Tools

- file_manager
- json_validator

## Rules

- One JSON + one MD per module in the catalog
- Charter and spec content combined in a single file per module
- Read entity file for fields, rules, stateMachine — do not re-derive from scratch
- No new requirements allowed — only content traceable to inputs
- All state transitions and error conditions must be explicit

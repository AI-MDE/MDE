# Generate Modules

| Field | Value |
|-------|-------|
| `name` | `generate_modules` |
| `phase` | system_design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- module_definition

## Tools

- file_manager
- json_validator

## Rules

- Step 1 â€” Build or refresh module-catalog.json from entity files and nonEntityModules in application_architecture.json
- Step 2 â€” For every module in the catalog, produce one JSON + one MD module definition
- Entity-driven modules: one module per ent-*.json file
- Non-entity modules: one module per entry in application_architecture.json nonEntityModules
- Read each entityRef file for fields, rules, stateMachine â€” do not re-derive
- Apply module_type_rules from architecture.json to set generates[], required spec sections, domain artifacts
- No overlapping responsibilities; dependencies must be explicit and directional
- No new requirements â€” all content traceable to inputs
- All state transitions and error conditions must be explicit

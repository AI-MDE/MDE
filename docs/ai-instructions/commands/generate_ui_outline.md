# Generate UI Outline

| Field | Value |
|-------|-------|
| `name` | `generate_ui_outline` |
| `phase` | system_design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- ui_module_definition

## Tools

- file_manager
- json_validator

## Rules

- Step 1 â€” Identify UI modules: one per cohesive user workflow derived from use cases and business functions
- Step 2 â€” Write ui-catalog.json listing all UI modules with id, name, routePrefix, primaryUsers, backendModules, priority
- Step 3 â€” For each UI module, write ui-{kebab-name}.json with full page specifications
- Every page must declare requirementRefs and businessFunctionRef
- Every use case must map to at least one page
- All actors from application.json must appear in at least one module's primaryUsers
- No new requirements â€” all pages traceable to requirements or use cases

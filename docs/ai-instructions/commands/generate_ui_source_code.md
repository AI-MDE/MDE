# Generate UI Source Code

| Field | Value |
|-------|-------|
| `name` | `generate_ui_source_code` |
| `phase` | development |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- ui_source_code_generation

## Tools

- file_manager
- json_validator

## Rules

- Generate one UI module folder per entry in ui-catalog.json
- Each page in a UI module spec becomes one component file
- Follow framework and styling choices from config.ui

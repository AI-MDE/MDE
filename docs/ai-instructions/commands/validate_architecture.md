# Validate Architecture

| Field | Value |
|-------|-------|
| `name` | `validate_architecture` |
| `phase` | system_design |
| `intent` | validate |
| `ai` | `required` |
| `skill` | `architecture_validation` |

---

## Skill

Delegates to skill: `architecture_validation`

## Tools

- file_manager
- architecture_validator

## Rules

- Use AI semantic validation for pattern declarations, layer rules, dependency rules, and module alignment
- Return explicit findings with severity and recommended fixes
- Do not mutate architecture artifacts during validation

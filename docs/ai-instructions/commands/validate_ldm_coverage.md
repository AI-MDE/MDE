# Validate LDM Coverage

| Field | Value |
|-------|-------|
| `name` | `validate_ldm_coverage` |
| `phase` | system_design |
| `intent` | validate |
| `ai` | `required` |
| `skill` | `ldm_coverage_validation` |

---

## Skill

Delegates to skill: `ldm_coverage_validation`

## Tools

- file_manager

## Rules

- Verify that BA noun terms are covered by entity, attribute, relationship, actor/role, or synonym mappings.
- Report explicit gaps with suggested canonical mappings.
- Do not mutate LDM during validation.
- Prefer semantic AI reasoning over token-only heuristics.

# Validate Requirements

| Field | Value |
|-------|-------|
| `name` | `validate_requirements` |
| `phase` | business_analysis |
| `intent` | validate |
| `ai` | `optional` |

---

## Calls

- requirements_validation

## Requires

- ../../ba/requirements.md

## Produces

- ../../ba/requirements-validation-report.json

## Tools

- file_manager
- json_validator
- traceability_engine

## Rules

- Do not modify source requirements unless explicitly requested
- Report ambiguity, missing actors, missing acceptance criteria, and traceability gaps

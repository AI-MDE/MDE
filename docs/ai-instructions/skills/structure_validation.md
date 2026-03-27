# structure_validation

| Field | Value |
|-------|-------|
| `name` | `structure_validation` |

---

## Purpose

Validate that the physical folder structure matches the configuration

## Inputs

- ../../configuration.json

## Outputs

- ../../output/work/structure-validation-report.json

## Rules

- Fail if critical root folders are missing
- Warn if optional folders are missing

## Tools Used

- file_manager

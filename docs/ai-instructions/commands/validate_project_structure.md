# Validate Project Structure

| Field | Value |
|-------|-------|
| `name` | `validate_project_structure` |
| `phase` | governance |
| `intent` | validate |
| `ai` | `none` |

---

## Calls

- structure_validation

## Requires

- ../../configuration.json

## Produces

- ../../output/work/structure-validation-report.json

## Tools

- file_manager

## Rules

- Verify all configured paths exist
- Report missing folders as blockers

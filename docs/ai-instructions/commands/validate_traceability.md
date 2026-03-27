# Validate Traceability

| Field | Value |
|-------|-------|
| `name` | `validate_traceability` |
| `phase` | governance |
| `intent` | validate |
| `ai` | `optional` |

---

## Calls

- governance_validation

## Requires

- ../../ba/requirements.md
- ../../design/modules/module-catalog.json
- ../../design/modules/module-tests.json

## Produces

- ../../design/traceability-validation-report.json
- ../../design/trace-matrix.json

## Tools

- traceability_engine
- file_manager

## Rules

- Every requirement must map to at least one module and one test

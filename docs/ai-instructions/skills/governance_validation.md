# governance_validation

| Field | Value |
|-------|-------|
| `name` | `governance_validation` |

---

## Purpose

Validate traceability, phase completeness, TOGAF/Zachman coverage, and missing artifacts

## Inputs

- ../../ba/requirements.md
- ../../design/modules/module-catalog.json
- ../../design/modules/module-tests.json
- ../../mde/methodology/methodology.json
- ../../project/project-state.json

## Outputs

- ../../design/trace-matrix.json
- ../../output/work/phase-status-report.json
- ../../design/governance-report.json

## Rules

- Every requirement should map to functions, modules, and tests where relevant
- Missing artifacts must be reported, not guessed

## Tools Used

- traceability_engine
- phase_status_checker
- file_manager

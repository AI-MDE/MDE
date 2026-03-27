# Show Phase Status

| Field | Value |
|-------|-------|
| `name` | `show_phase_status` |
| `phase` | governance |
| `intent` | inspect |
| `ai` | `none` |

---

## Calls

- governance_validation

## Requires

- ../../project/project-state.json
- ../../mde/methodology/methodology.json

## Produces

- ../../output/work/phase-status-report.json

## Tools

- file_manager
- phase_status_checker

## Rules

- Report complete, in-progress, blocked, and missing artifacts per phase

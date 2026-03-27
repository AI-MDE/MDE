# diagram_generation

| Field | Value |
|-------|-------|
| `name` | `diagram_generation` |
| `next_phase` | governance |

---

## Purpose

Generate diagrams from core artifacts

## Inputs

- ../../ba/data-model/logical-data-model.json
- ../../design/application_architecture.json
- ../../design/modules/module-catalog.json

## Outputs

- ../../output/docs/diagrams/*.md
- ../../output/docs/diagrams/*.svg

## Rules

- Render LDM, architecture, interaction, and dataflow diagrams
- Use canonical sources as inputs

## Tools Used

- file_manager

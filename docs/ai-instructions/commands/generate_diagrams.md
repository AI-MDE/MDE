# Generate Diagrams

| Field | Value |
|-------|-------|
| `name` | `generate_diagrams` |
| `phase` | governance |
| `intent` | generate |
| `ai` | `optional` |

---

## Calls

- diagram_generation

## Requires

- ../../ba/data-model/logical-data-model.json
- ../../design/application_architecture.json
- ../../design/modules/module-catalog.json

## Produces

- ../../output/docs/diagrams/*.md
- ../../output/docs/diagrams/*.svg

## Tools

- file_manager

## Rules

- Produce LDM, architecture, interaction, and dataflow diagrams
- Keep diagrams derived from canonical artifacts

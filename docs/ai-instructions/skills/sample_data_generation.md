# sample_data_generation

| Field | Value |
|-------|-------|
| `name` | `sample_data_generation` |
| `next_phase` | development |

---

## Purpose

Generate sample entity data files

## Inputs

- ../../ba/data-model/logical-data-model.json
- ../../design/entities/*.json

## Outputs

- ../../output/sample-data/*.json

## Rules

- Respect field types and required flags
- Use deterministic values per entity

## Tools Used

- file_manager

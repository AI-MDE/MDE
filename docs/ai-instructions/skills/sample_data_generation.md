# sample_data_generation

| Field | Value |
|-------|-------|
| `name` | `sample_data_generation` |
| `next_phase` | development |

---

## Purpose

Generate sample entity data files

## Rules

- Respect field types and required flags
- Use deterministic values per entity
- Generate RFC 4122 v4 UUIDs for all ID fields (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
- Maintain UUID consistency across related records and foreign key references
- Use a deterministic seed (e.g., entity name + sequence number) when mapping to UUID generation for reproducibility

## Tools Used

- file_manager

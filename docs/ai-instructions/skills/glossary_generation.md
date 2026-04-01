# glossary_generation

| Field | Value |
|-------|-------|
| `name` | `glossary_generation` |

---

## Purpose

Extract domain-specific terms from the requirements baseline and application definition, producing a structured glossary in business language

## Rules

- Extract terms from actors, functional requirements, business rules, leave types, and application scope
- Each term must have id, term, definition, source_refs; aliases is optional
- Terms must be domain-specific â€” do not include generic technical terms (e.g. 'database', 'API', 'system')
- Definitions must be written in business language, not technical language
- Do not overwrite an existing glossary â€” append new terms only (check for existing GLO-NNN IDs before assigning new ones)
- Sort terms alphabetically by term name
- Output as a Markdown table with columns: ID | Term | Definition | Aliases | Source Refs

## Tools Used

- file_manager

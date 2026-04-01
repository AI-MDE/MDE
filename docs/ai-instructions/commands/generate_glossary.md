# Generate Glossary

| Field | Value |
|-------|-------|
| `name` | `generate_glossary` |
| `phase` | business_analysis |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- glossary_generation

## Tools

- file_manager

## Rules

- Extract domain terms from requirements baseline and application definition
- Each term must have: id, term, definition, source_refs, and optional aliases
- Terms must be domain-specific â€” do not include generic technical terms
- Definitions must be written in business language, not technical language
- Do not overwrite an existing glossary â€” append new terms only

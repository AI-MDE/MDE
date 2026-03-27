# Generate Use Cases

| Field | Value |
|-------|-------|
| `name` | `generate_use_cases` |
| `phase` | business_analysis |
| `intent` | generate |
| `ai` | `required` |
| `skill` | `use_case_generation` |

---

## Skill

Delegates to skill: `use_case_generation`

## Requires

- ../../ba/requirements.md
- ../../ba/business-functions.json

## Produces

- ../../ba/use-cases/uc-*.md

## Tools

- file_manager

## Rules

- Use consistent UC numbering and naming.
- Each use case must include actors, preconditions, main flow, and postconditions.
- AI drafts content first, then persist normalized markdown files.
- Do not overwrite existing use cases unless explicitly requested.

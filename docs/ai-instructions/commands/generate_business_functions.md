# Generate Business Functions

| Field | Value |
|-------|-------|
| `name` | `generate_business_functions` |
| `phase` | business_analysis |
| `intent` | generate |
| `ai` | `required` |
| `skill` | `business_function_generation` |

---

## Skill

Delegates to skill: `business_function_generation`

## Tools

- file_manager

## Rules

- Generate capability/function hierarchy before detailed use-case generation.
- Include function id, name, description, and outcomes.
- AI drafts first, then persist normalized JSON output.

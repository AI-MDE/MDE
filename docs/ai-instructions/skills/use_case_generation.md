# Use Case Generation

| Field | Value |
|-------|-------|
| `name` | `use_case_generation` |
| `category` | business_analysis |

---

## Purpose

Generate business use cases from requirements and lifecycle context, then normalize output to repository standards.

## When to Use

- User asks to generate initial use cases from BA baseline
- Requirements exist but BA/use-cases are incomplete
- Need to refresh use-case docs after baseline changes

## Methodology

- Read requirements baseline and identify core user/system goals, actors, and workflow steps.
- Draft concise use cases with consistent numbering and naming.
- Ensure each use case includes: Description, Actors, Preconditions, Main Flow, Postconditions.
- Prefer incremental creation; keep existing files unless overwrite is explicitly requested.
- After AI drafting, run tool normalization/write flow to persist consistent markdown.

## Constraints

- Do not invent domain-critical constraints not present in baseline.
- Do not overwrite existing use-case files unless force/explicit overwrite is requested.
- Do not emit partial documents missing required sections.

## Completion Criteria

- At least one use case is generated when baseline supports it.
- Output files follow uc-###-<slug>.md naming.
- All generated use cases contain required sections.
- Project state is updated with generated artifacts.

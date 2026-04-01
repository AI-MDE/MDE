# Business Function Generation

| Field | Value |
|-------|-------|
| `name` | `business_function_generation` |
| `category` | business_analysis |

---

## Purpose

Generate business capabilities/functions from requirements as a precursor to use-case generation.

## When to Use

- Business-analysis baseline exists and capability model is missing
- Use-case generation should be grounded in business functions
- Need standardized function catalog for downstream traceability

## Methodology

- Extract top-level capabilities from requirements baseline.
- Derive core business functions under each capability.
- Keep names concise and domain-aligned.
- Write deterministic JSON schema with stable identifiers.
- AI-first generation with deterministic tool fallback.

## Completion Criteria

- business-functions.json exists and parses.
- Each function has id, name, description, and outcomes.
- Catalog is sufficient to anchor use-case generation.

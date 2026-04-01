# LDM Coverage Validation

| Field | Value |
|-------|-------|
| `name` | `ldm_coverage_validation` |
| `category` | system_design |

---

## Purpose

Validate that BA nouns are represented in the logical data model as entities, attributes, relationships, roles/actors, or explicit synonyms.

## When to Use

- After LDM generation in system design
- When BA terms seem unmatched in data model artifacts
- Before moving from BA/system design to module definition

## Methodology

- Extract canonical noun terms from BA artifacts (requirements, use cases, business functions).
- Normalize term variants and detect semantic equivalence.
- Match terms to LDM coverage classes: entity, attribute, relationship, role_actor, synonym.
- Produce explicit missing-term list with recommended target class and candidate mapping.
- Flag ambiguous mappings separately from clear misses.

## Constraints

- Do not auto-edit LDM during validation.
- Do not rely only on lexical token matches; include semantic matching.
- Do not suppress unresolved terms.

## Completion Criteria

- Coverage report generated with clear totals and percentages.
- Every missing term has a recommended mapping target.
- Ambiguous terms are explicitly listed for analyst decision.

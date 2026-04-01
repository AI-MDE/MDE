# physical_entity_identification

| Field | Value |
|-------|-------|
| `name` | `physical_entity_identification` |
| `next_phase` | module_definition |

---

## Purpose

Translate logical data model entities into physical entity definitions â€” one file per table â€” applying architecture rules for fields, indexes, state machines, business rules, and events

## Rules

- One output file per physical table â€” filename: ent-{kebab-case-name}.json
- Derive fields from LDM entity attributes; apply data-rules for standard columns
- Add version_no for workflow and master_data module types per concurrency-rules
- Add stateMachine block for workflow module type; derive states and transitions from requirements
- Add rules block for rule_engine module type; derive from business rules in requirements
- Derive indexes from FK columns, status fields, and query patterns stated in requirements
- Set auditRequired true for entities whose module type is workflow or whose changes are in audit-rules scope
- Do not invent entities, fields, or relationships not traceable to the LDM or requirements
- All FK column names use snake_case per data-rules naming convention

## Tools Used

- file_manager
- json_validator

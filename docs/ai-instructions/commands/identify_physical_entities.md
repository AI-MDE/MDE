# Identify Physical Entities

| Field | Value |
|-------|-------|
| `name` | `identify_physical_entities` |
| `phase` | design |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- physical_entity_identification

## Tools

- file_manager
- json_validator

## Rules

- One entity file per physical table
- Every entity must have a declared owningModule
- Apply data-rules: UUID surrogate PK named id, created_at, updated_at on every table
- Apply concurrency-rules: add version_no for workflow and master_data module types
- Apply audit-rules: add auditRequired flag for workflow_state_changes and approval_decisions
- Derive stateMachine block for workflow entities from requirements and LDM
- Derive rules block for rule_engine entities from business rules in requirements
- Derive indexes from relationships, status fields, and query patterns
- Do not invent entities not present in the LDM or requirements

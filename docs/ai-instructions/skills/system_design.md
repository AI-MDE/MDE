# system_design

| Field | Value |
|-------|-------|
| `name` | `system_design` |
| `next_phase` | module_definition |

---

## Purpose

Generate architecture and design artifacts from validated business analysis outputs, following the iterative design process defined in system-design-process.md

## Rules

- Module types must be drawn from architecture.json module_types: workflow, master_data, integration, reporting, rule_engine
- Every write use case must produce exactly one Service class and one Command type
- Every read requirement must produce exactly one QueryService class and one ReadDto
- Every aggregate root must have: Entity, Repository port (interface), Repository impl, Mapper
- Reads route through query_service -> data_access â€” never through service or domain
- Writes route through service -> domain Entity -> data_access
- Requirement-to-module traceability must exist for every business rule
- Patterns must be explicit and drawn from architecture.json patterns
- Runtime components and code modules must be distinguished

## Tools Used

- file_manager

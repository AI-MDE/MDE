# architecture_validation

| Field | Value |
|-------|-------|
| `name` | `architecture_validation` |
| `next_phase` | module_definition |

---

## Purpose

As a Senior Software Engineering and Architecture Expert, validate architecture artifacts against declared patterns, layer rules, and software engineering best practices.

## Inputs

- ../../mde/architecture/architecture.json
- ../../design/application_architecture.json
- ../../design/modules/module-catalog.json

## Outputs

- ../../work/architecture-validation-report.json

## Rules

- Apply senior-level software architecture judgment and challenge weak design assumptions
- Check that all declared layers are present: view, controller, service, query_service, domain, data_access, adapter
- Check that writes route through service -> domain -> data_access
- Check that reads route through query_service -> data_access (not through domain)
- Check that each service method corresponds to exactly one use case
- Check that domain layer has no dependencies on data_access, service, query_service, or adapter
- Check that query_service is stateless and read-only
- Check that every workflow module has a StateMachine artifact in domain layer
- Check that every data_access layer has a Mapper artifact
- Check that Commands are defined for every write operation
- Check that ReadDto types exist for every QueryService
- Check module alignment with architecture — module types match declared module_types
- Evaluate separation of concerns, cohesion, and coupling across modules
- Evaluate maintainability, extensibility, testability, and operability implications
- Verify traceability from requirements to architecture and module boundaries
- Highlight risks related to security, performance, reliability, and observability
- Classify findings by severity (error, warning, info)
- Recommend concrete corrective actions for each non-compliant finding

## Tools Used

- file_manager
- architecture_validator

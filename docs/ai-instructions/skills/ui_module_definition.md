# ui_module_definition

| Field | Value |
|-------|-------|
| `name` | `ui_module_definition` |
| `next_phase` | development |

---

## Purpose

Design UI modules and pages for the application â€” derived from user tasks, use cases, business functions, and domain entities. Produces a structured UI module catalog and per-module page specifications ready for UI source code generation.

## Rules

- Read application.json for actors â€” all primaryUsers and requiredRoles must reference defined actors
- Read use-case files â€” each use case must map to at least one page
- Design from user tasks, not database tables â€” derive pages from what actors need to accomplish
- Every page must declare requirementRefs and businessFunctionRef â€” no untraced pages
- Prefer dashboard, list, detail, and form patterns â€” use wizard only for branching multi-step flows
- Keep navigation shallow â€” routePrefix + one sub-path level maximum
- Each drill-down must appear in both drillsInto on the source page and navigation.flows
- Actions of type delete must be type confirm â€” never a direct destructive action
- Filters only where data volume or search need is identified in requirements
- Validation rules required on all form pages â€” must align with DomainValidator constraints where applicable
- RequiredRoles must map directly to the Actors defined in the requirements baseline
- emptyState required on all list and dashboard pages
- backendModules must reference module IDs from module-catalog.json
- relatedEntities must reference entity names from entity files
- Priority: core = required for MVP, secondary = important but deferrable, optional = nice-to-have
- One UI module per cohesive user workflow â€” do not split a single workflow across modules
- No new requirements â€” all pages must be traceable to requirements or use cases
- ui-catalog.json must include a top-level menu array â€” one entry per UI module, ordered by actor priority (core modules first), with the module's entryPoint route
- navigation.menuVisible must be true for pages reachable directly from the menu, false for pages only reachable via in-page flows
- subNav is optional â€” include only when a module has 3 or more peer sections that warrant a persistent tab bar (e.g. HR Admin with Leave Types / Balances / Requests tabs); omit for simple linear workflows
- navigation.flows covers in-page transitions only â€” menu-level navigation is covered by the catalog menu array

## Tools Used

- file_manager
- json_validator

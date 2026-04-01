# module_definition

| Field | Value |
|-------|-------|
| `name` | `module_definition` |
| `next_phase` | source_code_generation |

---

## Purpose

Produce a complete module definition per module in the catalog â€” combining charter (ownership, boundaries, interfaces, dependencies) and spec (schema, rules, state machine, events, API) into a single implementation-ready artifact.

## Rules

- Process every module in module-catalog.json â€” one JSON + one MD per module
- Read entityRef file for columns, indexes, rules, stateMachine, relationships â€” do not re-derive
- Set generates[] from catalog â€” do not invent or omit layers
- Apply module_type_rules to determine required spec sections and domain artifacts
- Responsibilities and exclusions derived from entity file description and rules
- Exclusions must name the delegated module by ID and name
- Each service interface method must include errorConditions listing all possible error types
- Each service method must include steps: authorize, load, domain behavior, save, emit event
- query_service methods must not reference domain layer
- DTO naming: Command for write inputs, ReadDto for query outputs, ResponseDto for write outputs
- API paths use kebab-case plural resource names
- Dependencies list only modules this module calls â€” not modules that call it
- requirementMapping traces each BR to its layer (domain | service | query_service | controller) and artifact
- stateMachine required for workflow module type â€” derive transitions from entity file
- events.published required for workflow and rule_engine module types
- No new requirements â€” all content must be traceable to inputs
- All state transitions and error conditions must be explicit

## Tools Used

- file_manager
- json_validator

# module_definition

| Field | Value |
|-------|-------|
| `name` | `module_definition` |
| `next_phase` | source_code_generation |

---

## Purpose

Produce a complete module definition per module in the catalog — combining charter (ownership, boundaries, interfaces, dependencies) and spec (schema, rules, state machine, events, API) into a single implementation-ready artifact.

## Inputs

- ../../design/modules/module-catalog.json
- ../../design/entities/ent-*.json
- ../../ba/requirements.md
- ../../mde/architecture/architecture.json

## Outputs

- ../../design/modules/{moduleType}/module-{kebab-module}.json
- ../../design/modules/{moduleType}/module-{kebab-module}.md

## Rules

- Process every module in module-catalog.json — one JSON + one MD per module
- Read entityRef file for columns, indexes, rules, stateMachine, relationships — do not re-derive
- Set generates[] from catalog — do not invent or omit layers
- Apply module_type_rules to determine required spec sections and domain artifacts
- Responsibilities and exclusions derived from entity file description and rules
- Exclusions must name the delegated module by ID and name
- Each service interface method must include errorConditions listing all possible error types
- Each service method must include steps: authorize, load, domain behavior, save, emit event
- query_service methods must not reference domain layer
- DTO naming: Command for write inputs, ReadDto for query outputs, ResponseDto for write outputs
- API paths use kebab-case plural resource names
- Dependencies list only modules this module calls — not modules that call it
- requirementMapping traces each BR to its layer (domain | service | query_service | controller) and artifact
- stateMachine required for workflow module type — derive transitions from entity file
- events.published required for workflow and rule_engine module types
- No new requirements — all content must be traceable to inputs
- All state transitions and error conditions must be explicit

## Tools Used

- file_manager
- json_validator

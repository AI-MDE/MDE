# System Design Process

## Purpose

This document defines the iterative process for moving from business requirements and a database schema to a running application, using the layering architecture defined in `business-app-layering-notes.md`.

---

## The Loop

The process is a cycle, not a one-pass waterfall.

```
  ┌─────────────────────────────────────────┐
  │                                         ▼
Step 1        Step 2        Step 3        Step 4
Identify  →   Spec      →  Assume UI  →  Build & Run
Modules       Modules       & Generate    then loop back
```
Each pass through the loop either adds new modules or refines existing ones based on what running the app reveals.


## Related AI Commands

Two threads run through the process. The Data Thread must produce a schema before the Module Thread can generate code.

```
Data Thread          Module Thread
─────────────        ─────────────────────────────────
generate_ldm    ──┐
validate_ldm_      │  (schema ready)
  coverage         │
generate_pdm        ├──▶  build_system_design    [Step 1 — Identify]
generate_schema ───┘      generate_modules       [Step 1–2 — Catalog + Spec]
generate_sample_data      validate_architecture  [Step 2 — Review]
                          generate_source_code   [Step 3 — Generate]
```

### Data Thread — what each command does

| Command | Purpose | Process step |
|---|---|---|
| `generate_ldm` | Generate Logical Data Model from requirements | Pre-Step 1 |
| `validate_ldm_coverage` | Check LDM covers all use cases and business rules | Pre-Step 1 |
| `generate_pdm` | Generate Physical Data Model from LDM | Pre-Step 1 |
| `generate_schema` | Generate SQL schema from PDM | Pre-Step 1 |
| `generate_sample_data` | Generate seed data for all tables | Step 4 |

### Module Thread — what each command does

| Command | Purpose | Process step |
|---|---|---|
| `build_system_design` | Produce initial module catalogue from use cases + schema | Step 1 — Identify |
| `generate_modules` | Build/refresh catalog + full definition for every module | Step 1–2 |
| `validate_architecture` | Check catalogue for coverage, layering, and dependency violations | Step 2 — Review |
| `generate_source_code` | Generate all layers for a module from its spec | Step 3 — Generate |

---

## Inputs Required

| Input | Content | Location | Required for |
|---|---|---|---|
| Use cases | Actor, goal, steps, preconditions | `ba/requirements.md` | Steps 1–2 |
| Business rules | Invariants, constraints, workflow rules | `ba/requirements.md` | Steps 1–2 |
| DB schema | Tables, columns, PKs, FKs, constraints | `design/sql/schema.json` | All steps |
| Architecture reference | Layer responsibilities, decision guide | `mde/docs/design/business-app-layering.md` | All steps |

UI does not need to be formally defined before starting. Step 3 handles this with assumptions.

---

## Step 1 — Identify Modules

The goal is a **module catalogue** — a list of every class that needs to exist, with enough definition to spec and generate it.

### 1a. Extract aggregate roots from the schema

Each table that is an aggregate root (own identity, not a pure child table) becomes a module.

For each aggregate root you will need:
- Domain Entity
- Repository port (interface)
- Repository implementation
- Mapper

Use FK relationships to identify child tables (e.g. `order_item` belongs to `order`).

**Output:** list of aggregate root modules.

### 1b. Map use cases to UseCase classes

Each write operation in the use case list becomes a UseCase class. See `use-case-mapping.md` for the full mapping rules.

For each write operation:
- Name the UseCase (`<Verb><Noun>UseCase`)
- Identify the Command input type
- Identify which aggregate it operates on
- Note cross-aggregate dependencies

**Output:** list of UseCase + Command pairs.

### 1c. Identify read modules

For each screen or endpoint that reads data, identify a QueryService.

At this stage, name the QueryService and note what aggregate it reads from. The exact DTO shape is resolved in Step 3 when UI is assumed.

**Output:** list of QueryService candidates with their aggregate.

### 1d. Classify business rules

For each business rule, assign it to an owner using the decision guide:

| Rule type | Belongs in |
|---|---|
| Object invariant (impossible state) | Domain Entity |
| State transition guard | Domain Entity |
| Action precondition (workflow) | UseCase |
| Actor permission check | UseCase |
| Multi-object coordination | UseCase |
| Request field validation | Controller / boundary |

**Output:** each rule annotated with its owner class.

### 1e. Record the module catalogue

For each module, record:

```
name:         ClaimRepository
type:         Repository port
layer:        Application — ports
aggregate:    Claim
dependencies: (none)
constraints:  must not import infrastructure
notes:        interface only; implemented by PostgresClaimRepository
```

Full type list:

- `DomainEntity`
- `UseCase`
- `Command`
- `QueryService`
- `Repository port`
- `Repository impl`
- `Mapper`
- `Controller`
- `Router`
- `DTO` (request / response / read model)
- `ErrorHandler`
- `Container` (DI wiring)

---

## Step 2 — Spec Modules

For each module in the catalogue, write a spec before generating code.

The spec is the contract the generator works from. It must be complete enough that generation requires no guessing.

### Spec contents per module type

**Domain Entity**
- Fields and types
- State machine (valid statuses and transitions)
- Business rules assigned to this entity (from 1d)
- Factory method signature (`create` / `rehydrate`)

**UseCase**
- Command fields and types
- Authorization rule
- Steps: load → act → save
- Domain entity method called
- Side effects — for each: notifications, audit log, business event
  - Does this operation emit a business event? (see `business-events.md`)
  - If yes: event type, payload fields, delivery requirement (fire-and-forget vs outbox)
- Error cases (not found, concurrency, authorization denied)

**QueryService**
- Input filters / parameters
- Output DTO fields — see Step 3 for UI assumption
- Tables / joins involved
- Sort and pagination behaviour

**Repository port**
- Method signatures only
- Return types

**Mapper**
- DB column → domain field mappings
- Any type coercions (e.g. `string` → `Date`, snake_case → camelCase)

**Controller**
- HTTP method and route
- Request binding (params, body, query)
- UseCase or QueryService called
- Response status and shape

---

## Step 3 — Assume UI and Generate

UI does not need to be formally signed off before generating. Make explicit assumptions about what each screen shows, document them, and generate based on those assumptions.

### How to assume UI

For each QueryService identified in Step 1c:

1. Name the screen (e.g. "Claim List", "Claim Detail", "Agent Dashboard")
2. List the fields the screen most likely needs based on the use cases and schema
3. List likely filters (status, date range, assigned agent, etc.)
4. Record the assumption explicitly

Example assumption record:
```
screen:       Claim List
assumed fields: id, claimant name, status, submitted date, assigned agent
assumed filters: status, date range
assumption basis: standard list view pattern; covers supervisor and agent workflows
revisit if:   stakeholder requires additional columns or grouping
```

Assumptions are cheap to change. Deferring generation until UI is formally defined is expensive.

### Generation order

Generate in dependency order — lower layers first:

1. Shared types and errors (`DomainError`, `NotFoundError`, etc.)
2. Domain Entities (no dependencies)
3. Commands (no dependencies)
4. Repository ports / interfaces (depend on entities)
5. UseCases (depend on entities, commands, repository ports)
6. Mappers (depend on entities and DB row types)
7. Repository implementations (depend on mapper, DB client, port interface)
8. QueryServices (depend on DB client, DTOs)
9. Controllers (depend on use cases and query services)
10. Routers (depend on controllers)
11. DI container (wires all implementations to ports)
12. Server entry point

### Per-module generation contract

The generator needs from the spec:
- Module name and type
- Layer
- Dependencies (by name)
- Business rules (for Entity and UseCase)
- Input/output types (Command shape, DTO shape)
- Constraints (optimistic locking, auth, validation)

---

## Step 4 — Build and Run

Run the application and validate against the use cases.

**Check:**
- Does each write operation work end-to-end?
- Does each screen show the right data?
- Are business rules enforced correctly?
- Do error cases return the right responses?

**What triggers a loop back to Step 1:**
- A screen needs data the current QueryService doesn't provide
- A use case step was missed during identification
- Running the app reveals a missing module or wrong assumption
- Stakeholder feedback changes the UI or business rules

Record what changed and why, then re-enter Step 1 for the affected modules only. Do not regenerate the entire catalogue — scope the loop to what changed.

---

## Output Structure

```
src/
  app/
    shared/
      errors/       domain errors, error handler
      auth/         actor context, auth interface
      db/           db client interface
    container.ts    DI wiring
  modules/
    <module>/
      domain/       Entity, types
      application/
        commands/   Command types
        use-cases/  UseCase classes + specs
        queries/    QueryService classes
        ports/      Repository interfaces
      infrastructure/
        <module>.mapper.ts
        postgres-<module>.repository.ts
      api/
        <module>.controller.ts + spec
        <module>.router.ts
  web/              server-rendered route handlers
  views/            EJS templates
  seed/             sample data + load script
  server.ts         entry point
```

---

## Reference

- Architecture decisions: `mde/docs/design/business-app-layering.md`
- Use case mapping: `mde/docs/design/use-case-mapping.md`
- Business events: `mde/docs/design/business-events.md`
- Example implementation: `sample-app/src/`

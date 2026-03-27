# Architecture Rule Files

This folder contains the **generic, reusable architectural rules** for any project built with this MDE engine. Rules here apply to all projects that select this architecture. They are not project-specific.

## Files

| File | Governs |
| --- | --- |
| `architecture.json` | Root manifest: selected patterns, layer stack, tech stack, dependency model, references to rule files |
| `layer-rules.json` | Per-layer allowed/forbidden dependencies and responsibilities |
| `module-type-rules.json` | Per module type: recommended patterns, required artifacts, forbidden behaviours |
| `interface-rules.json` | DTO conventions: naming suffix (`RequestDto` / `ResponseDto`), no direct entity exposure |
| `data-rules.json` | Persistence conventions: surrogate UUID PKs, default columns (`created_at`, `updated_at`), naming case |
| `concurrency-rules.json` | Optimistic locking policy: which module types require `version_no`, conflict behaviour |
| `audit-rules.json` | Audit event scope, event shape, immutability (append-only) |
| `responsibility_allocation_rules.md` | Where each cross-cutting concern must live and must not live |

## How skills use these files

1. Load `mde/architecture/architecture.json` as the root manifest.
2. Resolve the referenced rule files listed under `rule_files`.
3. Merge: global rules + layer rules + module-type rules + concern-specific rules.
4. Pass the merged rule set into the target skill or generator.

---

## Boundary: what belongs here vs. in `design/application_architecture.json`

### `mde/architecture/` owns — generic rules, reusable across projects

- Layer stack and dependency enforcement rules
- Module type patterns and required artifacts
- DTO, data, concurrency, and audit conventions
- Tech stack selection

### `design/application_architecture.json` owns — project-specific architectural decisions

Only content that **cannot be derived from the selected generic architecture** belongs here:

| Concern | Example |
| --- | --- |
| External integration points | Payment gateway for payout, SMTP adapter for notifications, HR system for claimant import |
| Architectural overrides | A module that explicitly deviates from a generic rule, with justification |
| Application-wide decisions not covered by the generic arch | Async vs sync notification dispatch, multi-tenancy strategy |

### What does NOT belong in `design/application_architecture.json`

| Concern | Where it actually lives |
| --- | --- |
| Module list and table names | `design/modules/module-catalog.json` |
| Use cases | `design/use-cases/` or `ba/use-cases/` |
| Entities and data model | `design/data-model/` or `ba/data-model/` |
| Business goals and requirements | `ba/requirements.md` |
| Layer definitions | `mde/architecture/layer-rules.json` |

### The guiding principle

> `design/application_architecture.json` should be nearly empty for a project that fits the standard architecture cleanly. It grows only when the project introduces integrations or justified deviations.

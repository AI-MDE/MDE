# AI-MDE Glossary

This glossary defines core terms used across AI-MDE commands, skills, methodology, and generated artifacts.

## Core Terms

| Term | Definition |
|---|---|
| Module | A bounded functional capability area with clear responsibility, interfaces, dependencies, and ownership. In code, typically mapped to a feature folder. |
| Component | A smaller implementation unit inside a module (for example: UI widget, service class, adapter). |
| Layer | A technical concern slice (for example: UI, service, domain, data access). Layers are horizontal; modules are vertical feature slices that may span layers. |
| Capability | A business or user-facing outcome the system must provide (for example: Submit Leave Request). |
| Bounded Context | A semantic boundary where terms and rules are consistent; often mapped to one or more modules. |
| Artifact | Any managed lifecycle output (requirements, architecture docs, module specs, diagrams, source files, tests, logs). |
| Command | A pipeline action definition in `ai-instructions/commands/` that declares intent, inputs, outputs, and required skills. |
| Skill | A reusable reasoning/generation behavior in `ai-instructions/skills/` invoked by commands. |
| Orchestrator | The command routing and phase-governance policy in `ai-instructions/orchestrator.json`. |
| Traceability | Explicit links from requirements to design, code, tests, and validation outputs. |
| Change Request | A structured request to modify baseline artifacts; evaluated for impact before regeneration. |

## Naming Guidance

- Prefer `module` for architecture-level feature boundaries.
- Prefer `component` for internal implementation pieces.
- Avoid using `module` and `component` as synonyms in the same artifact.

## Practical Mapping

- Logical: `module` -> architecture/model boundary
- Physical: `module` -> folder(s) in `src/`, tests, and docs
- Internal parts: `component` -> files/classes/functions within the module


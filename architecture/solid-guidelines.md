# SOLID Guidelines for Code Generation

Purpose
- Define explicit SOLID-oriented expectations for generated backend code.
- Complement existing layer and module rules in this folder.

Scope
- Applies to generated artifacts in `src/{module}/`.
- Primary layers: `controller`, `service`, `domain`, `data_access`, `query_service`.

## S: Single Responsibility Principle (SRP)
Rules
- Each Service public method maps to one use case only.
- Controller handles transport concerns only (parse/validate/request/response mapping).
- Domain entity/rules/state machine own business behavior and invariants only.
- Repository owns persistence only; Mapper owns field translation only.
- QueryService owns read shaping only.

Generator checks
- Reject multi-purpose service methods that mix unrelated use cases.
- Reject business-rule logic in controller/repository/mapper.
- Reject SQL in domain/service/query DTO files.

## O: Open/Closed Principle (OCP)
Rules
- Extend behavior via new command/service method/rule class, not by modifying unrelated existing flows.
- Add new integrations through adapter interfaces where possible.
- Keep module boundaries stable when adding use cases.

Generator checks
- Prefer adding new command and service method over branching unrelated method paths.
- Prefer interface-based extension points for notification/audit/integration handlers.

## L: Liskov Substitution Principle (LSP)
Rules
- Implementations must honor interface contracts and expected error semantics.
- Repository and service implementations must preserve null/not-found behavior described by interfaces.

Generator checks
- Ensure interface and implementation signatures match exactly.
- Ensure documented error conditions are preserved in implementation.

## I: Interface Segregation Principle (ISP)
Rules
- Keep interfaces focused and role-specific.
- Separate write contracts (Service interfaces) from read contracts (QueryService classes/interfaces).
- Avoid broad "god" repository interfaces.

Generator checks
- Reject catch-all interfaces containing unrelated methods.
- Split read and write responsibilities when method sets diverge.

## D: Dependency Inversion Principle (DIP)
Rules
- High-level policies (service/domain orchestration) depend on abstractions, not concrete persistence/integration classes.
- Use constructor injection for repository, publisher, and cross-module dependencies.
- Controllers depend on service/query abstractions.

Generator checks
- Reject direct `new ConcreteRepository()` in services/controllers.
- Require constructor-injected interfaces for cross-module calls and event publishing.

## Layer Mapping (Practical)
- `controller`: SRP, ISP, DIP
- `service`: SRP, OCP, DIP
- `domain`: SRP, OCP
- `data_access`: SRP, LSP
- `query_service`: SRP, ISP, DIP

## Traceability Notes
- Method-level docs must still include `@requirement` and `@design_concern` where required.
- SOLID guidance does not replace requirement traceability; both are mandatory.

## Non-Goals
- This document does not define formatting/lint style.
- This document does not override explicit project-specific rules in module specs.

## Adoption
- Recommended next step: reference this file from `architecture.json` global rules or rule file registry.

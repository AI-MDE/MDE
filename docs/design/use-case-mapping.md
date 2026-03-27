# Use Case Mapping

## Scope

This document maps **Business Use Case Items**: bounded application actions such as Submit Claim, Assign Claim, Approve Claim, and Deny Claim.

It does **not** attempt to define the full end-to-end business workflow or process lifecycle.

A broader **Business Use Case** may optionally be modeled later as a workflow, case-management process, or orchestration layer composed of multiple Use Case Items.


## Purpose

This document explains how business use cases map to application architecture classes — specifically UseCase classes, QueryServices, and Domain Entity methods.

---

## The core distinction

"Use case" means two different things depending on context:

| Context | Meaning |
|---|---|
| Business analysis | A complete user goal — actor, steps, preconditions |
| Application architecture | A single class owning one write operation |

They are **not 1:1**. A business use case produces multiple architecture classes.

---

## How a business use case breaks down

A business use case describes a user journey. Inside that journey:

| Step type | Maps to |
|---|---|
| User views / searches / lists something | `QueryService` |
| User commits a write action | `UseCase class` |
| System does something as a result | Side effect inside the `UseCase` |

One business use case typically produces:
- **1 or more UseCase classes** (one per write action)
- **2 or more QueryService calls** (the reads around the actions)

Some business use cases are pure reads — they produce no UseCase class at all, only QueryService calls.

---

## Example: "Handle a Claim Assignment"

```
1. Supervisor views unassigned claims         → QueryService
2. Supervisor selects a claim                 → QueryService (get by id)
3. Supervisor assigns claim to agent          → AssignClaimUseCase
4. Agent is overloaded — supervisor reassigns → ReassignClaimUseCase
5. Agent rejects the assignment               → RejectAssignmentUseCase
```

One business use case → three UseCase classes + two QueryService calls.

---

## Example: "Process a Claim Denial"

```
1. Agent views the claim details              → QueryService
2. Agent reviews supporting documents         → QueryService
3. Agent denies the claim with a reason       → DenyClaimUseCase
4. System notifies the claimant               → side effect inside DenyClaimUseCase
5. Claim appears in denied list               → QueryService
```

One business use case → one UseCase class + three QueryService calls + one side effect.

---

## What a UseCase class contains

A UseCase class owns exactly one write operation. The structure is always:

```ts
class DenyClaimUseCase {
  constructor(
    private readonly claimRepo: ClaimRepository,
    private readonly authz: AuthorizationService
  ) {}

  async execute(command: DenyClaimCommand, actor: ActorContext): Promise<void> {
    // 1. authorize
    this.authz.require(actor, "claim.deny");

    // 2. load
    const claim = await this.claimRepo.findById(command.claimId);
    if (!claim) throw new NotFoundError("Claim", command.claimId);

    // 3. domain behavior
    claim.deny();

    // 4. persist
    await this.claimRepo.save(claim);
  }
}
```

| Step | Responsibility | Owned by |
|---|---|---|
| Authorize | Is this actor allowed? | `AuthorizationService` |
| Load | Fetch the aggregate | `Repository` |
| Act | Apply business operation | `Domain Entity` method |
| Save | Persist changed state | `Repository` |

The UseCase coordinates and owns application/workflow logic for one bounded business action, but not core object invariants.

---

## What a UseCase class never contains

- SQL queries
- HTTP request/response handling
- Business rule enforcement (belongs in the entity)
- Read model shaping (belongs in QueryService)
- Multiple unrelated operations

---

## Why each write action gets its own UseCase class

Each write action has its own:
- preconditions (can only reassign if already assigned)
- Command input shape
- authorization rule
- domain entity method

Merging multiple write actions into one class because they share a business use case creates a bloated service with blurred responsibilities.

---

## How to identify UseCase classes from a business use case

Scan the business use case for **verbs the user commits**:

```
assign    → AssignClaimUseCase
reassign  → ReassignClaimUseCase
reject    → RejectAssignmentUseCase
approve   → ApproveClaimUseCase
deny      → DenyClaimUseCase
submit    → SubmitClaimUseCase
```

Each committed verb → one UseCase class candidate.

The nouns that get read around those verbs → QueryService candidates.

---

## Summary

```
Business Use Case (user goal)
  ├── read steps          → QueryService calls
  ├── write action 1      → UseCase class + Command
  ├── write action 2      → UseCase class + Command
  └── write action 3      → UseCase class + Command
```

The UseCase class maps to the **moment the user commits an action**, not to the whole user journey around it.

---

## Reference

- Layer responsibilities: `mde/docs/design/business-app-layering.md`
- Design process: `mde/docs/system-design-process.md`
- Example implementation: `sample-app/src/`

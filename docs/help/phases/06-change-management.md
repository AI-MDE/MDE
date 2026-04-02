# Phase 6 — Change Management

AI-MDE treats change as a first-class lifecycle concern. Every change request follows a mandatory governed workflow — the orchestrator enforces the sequence and maintains a full audit trail per request.

---

## Commands

```claude
Review Requests
Approve Request
```

---

## Workflow

```
Drop file into Requests/
  → Review Requests        ← list pending requests, pick one, AI analyses impact
  → Approve Request        ← confirms scope, triggers automatic downstream pipeline:
        1. Refine Business Requirements
        2. Elaborate System Design
        3. Validate Design Compliance
        4. Validate Traceability
        5. Generate Diagrams
        6. Generate Source Code
```

---

## Step by step

**1. Create the request file**

Write a markdown file describing the change and drop it into `Requests/`:
```
Requests/
  add-transactions-to-architecture.md
```

**2. Review Requests**
```claude
Review Requests
```
The orchestrator lists all pending requests as numbered options. Pick one. The AI analyses impact on requirements, design, code, and tests, and writes `project/change-requests/{slug}/analysis.md`.

If clarification questions are raised, answer them before proceeding. `Approve Request` is blocked until open questions are resolved or explicitly deferred.

**3. Approve Request**
```claude
Approve Request
```
Confirms the change is understood and in scope. The orchestrator automatically runs the downstream pipeline — no further commands needed.

---

## Automatic downstream pipeline

After `Approve Request` succeeds the orchestrator runs these steps internally:

| Step | Command | What it does |
|---|---|---|
| 1 | Refine Business Requirements | Updates requirements baseline for the change |
| 2 | Elaborate System Design | Updates architecture, modules, LDM as needed |
| 3 | Validate Design Compliance | Checks updated design against architecture rules |
| 4 | Validate Traceability | Ensures requirements → design → code trace is intact |
| 5 | Generate Diagrams | Regenerates affected diagrams |
| 6 | Generate Source Code | Regenerates affected source code |

---

## Artifacts

| Artifact | Path |
|---|---|
| Change request source file | `Requests/{slug}.md` |
| Request copy | `project/change-requests/{slug}/request.md` |
| Impact analysis | `project/change-requests/{slug}/analysis.md` |
| Pipeline step outputs | `project/change-requests/{slug}/ai/0N-{command}.md` |
| Manifest | `project/change-requests/{slug}/manifest.json` |

---

## Tips

- Keep request files focused — one change per file. Broad requests produce ambiguous impact analysis.
- Answer clarification questions in the analysis file before approving.
- After the pipeline completes, check `analysis.md` — it lists all modified documentation and source files with rationale.
- Run `Show Phase Status` after the pipeline to confirm all artifacts are up to date.

---

## Navigation

[← Phase 5 — Governance & Validation](./05-governance.md) &nbsp;|&nbsp; [Getting Started ↑](../getting-started.md)

# Phase 1 — Project Initiation

Establish the foundation before any analysis begins. Select the methodology and architecture pattern that will govern the rest of the lifecycle.

---

## Commands

```claude
Select Methodology
Select Architecture
```

---

## What it produces

| Artifact | Path |
|---|---|
| Project state | `project/project-state.json` |
| Application definition | `application/application.json` |
| Configuration | `configuration.json` |

---

## Tips

- Run `Select Methodology` first — it sets the phase rules and workflow patterns for the rest of the project.
- Run `Select Architecture` to choose the layer structure, module types, and dependency rules.
- These choices are recorded and used by every subsequent command — architecture validation and code generation both depend on them.
- You can re-run either command to change the selection, but be aware it may affect downstream artifacts.

---

## Navigation

← [Getting Started](../getting-started.md) &nbsp;|&nbsp; [Phase 2 — Business Analysis →](./02-business-analysis.md)

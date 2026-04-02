# Phase 3 — System Design

Derive the full system design from the requirements baseline — architecture, data model, modules, SQL schema, and UI outline.

---

## Commands

```claude
Build System Design
Generate LDM
Generate ERD
Generate Modules
Generate UI Outline
Generate SQL
Validate Architecture
Validate LDM Coverage
```

---

## Typical flow

1. Run:
```claude
Build System Design
```
2. Derive the data model:
```claude
Generate LDM
Generate ERD
```
3. Define modules and UI:
```claude
Generate Modules
Generate UI Outline
```
4. Generate the physical schema:
```claude
Generate SQL
```
5. Validate everything:
```claude
Validate Architecture
Validate LDM Coverage
```

---

## Artifacts

| Artifact | Path |
|---|---|
| Architecture document | `design/architecture.md` |
| Logical data model | `design/ldm.md` |
| ERD | `design/erd.md` |
| Module catalog | `design/modules/module-catalog.json` |
| Module definitions | `design/modules/` |
| Entity definitions | `design/entities/` |
| UI outline | `design/ui-outline.md` |
| SQL schema | `design/schema.sql` |

---

## Tips

- Run `Build System Design` before `Generate Modules` — modules are derived from the architecture document.
- Run `Generate LDM` before `Generate SQL` — the physical schema is derived from the logical model.
- Run `Validate Architecture` after any design change — catches compliance issues before they reach code generation.
- Run `Validate LDM Coverage` to ensure all requirements map to data entities.

---

## Navigation

[← Phase 2 — Business Analysis](./02-business-analysis.md) &nbsp;|&nbsp; [Phase 4 — Development →](./04-development.md)

# Phase 5 — Governance & Validation

Governance runs continuously throughout the lifecycle — not just at the end. These commands are available in any phase.

---

## Commands

```claude
Show Phase Status
Validate Requirements
Validate Architecture
Validate Design Compliance
Validate Traceability
Validate Project Structure
Assess Methodology
Assess Architecture
Generate Diagrams
Generate Documentation
Export Docs
```

---

## Typical flow

Run at any point during the lifecycle:

```claude
Show Phase Status
```

Before moving from design to development:
```claude
Validate Architecture
Validate Design Compliance
Validate Traceability
```

Before releasing or exporting:
```claude
Generate Diagrams
Generate Documentation
Export Docs
```

---

## Artifacts

| Artifact | Path |
|---|---|
| Generated diagrams | `docs/diagrams/` |
| Exported documentation | `output/` |
| Architecture validation report | `output/reports/architecture-validation-report.json` |
| LDM coverage report | `output/reports/ldm-coverage-report.json` |
| Phase status report | `output/reports/phase-status-report.json` |
| Validation reports | `project/validation/` |

---

## Diagrams generated

`Generate Diagrams` produces all of the following from current artifacts:

- State diagram
- Workflow diagram
- Module interaction diagram
- BPMN diagram
- Data flow diagram
- UI navigation diagram

---

## Tips

- `Show Phase Status` is safe to run at any time — it never modifies artifacts.
- Run `Validate Traceability` before `Export Docs` — it catches gaps between requirements, design, and code before documentation is published.
- `Assess Methodology` and `Assess Architecture` give a health check against the selected methodology and architecture rules.
- Governance commands do not require phase prerequisites — they are always available.

---

## Navigation

[← Phase 4 — Development](./04-development.md) &nbsp;|&nbsp; [Phase 6 — Change Management →](./06-change-management.md)

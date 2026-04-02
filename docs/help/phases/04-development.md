# Phase 4 — Development

Generate source code, UI code, and sample data from the module catalog and design artifacts.

---

## Commands

```claude
Generate Source Code
Generate UI Source Code
Generate Sample Data
Generate Screenshots
```

---

## Typical flow

1. Run:
```claude
Generate Source Code
```
2. Generate the UI layer:
```claude
Generate UI Source Code
```
3. Populate sample data for local development:
```claude
Generate Sample Data
```

---

## Artifacts

| Artifact | Path |
|---|---|
| Generated source code | `src/` (per module) |
| Generated UI code | `ui/src/` |
| Sample data | `design/sample-data/` |
| Generated manifest | `src/generated-manifest.json` |

---

## Tips

- Run `Generate Modules` (Phase 3) before `Generate Source Code` — the module catalog drives what gets generated.
- Code is generated per module — if a module changes, regenerate only that module rather than the full codebase.
- `Generate Sample Data` produces seed data matching the SQL schema — useful for populating a local dev database after schema generation.
- Check `src/generated-manifest.json` after generation — it lists every file written and the module it belongs to.

---

## Navigation

[← Phase 3 — System Design](./03-system-design.md) &nbsp;|&nbsp; [Phase 5 — Governance & Validation →](./05-governance.md)

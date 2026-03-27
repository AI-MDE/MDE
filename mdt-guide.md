# MDT â€” Model-Driven Tooling Guide

MDT is a pure engine. It owns no project data. It reads three files from the project root and adapts entirely to what it finds there.

---

## The Three Project Files

Every MDT-compatible project has three files at its root:

```
<project>/
  configuration.json    â† where artifacts live
  architecture.json     â† rules to validate against
                        - defines the project architecture and dependencies
                        - Tells MDT what kind of modules to generate and how to validate them
  methodology.json      â† completeness checklist per phase
                        - defines the project workflow
                        - Tells MDT what artifacts are required and when
```

### configuration.json â€” Where artifacts live

Tells MDT tools where to find and write every artifact. Controls folder paths, file naming patterns, and project identity.

```json
{
  "Project-Name": "...",
  "paths": {
    "methodology":       "methodology.json",
    "architecture":      "architecture.json",
    "mdt-guide":         "mdt-guide.md",
    "requirements-json": "1-BA/requirements.json",
    "use-cases-dir":     "1-BA/use-cases",
    "entities-dir":      "2 Design/entities",
    "modules-dir":       "2 Design/modules",
    "sql-dir":           "3-SQL"
  },
  "patterns": {
    "entities": "^ent-.*[.]json$",
    "modules":  "^mod-[0-9]+.*[.]json$"
  }
}
```

If a folder is renamed, update `configuration.json` â€” no tool code changes needed.

---
### Tooling

The pipeline is driven by a set of tools that operate on the project's artifacts. Each tool reads canonical sources and produces either derived artifacts or executable outputs.

| Tool | Input | Output | Phase |
|---|---|---|---|
| **Viewer / Navigator** | `configuration.json` + all artifacts | Interactive documentation browser | all |
| **Validator** | all artifacts + `configuration.json` | `validation-report.json` | all |
| **Generator** | module specs (`srv-*.json`, `dal-*.json`) | source files + `generated-manifest.json` | Development |
| **Trace Generator** | requirements + use cases + entities + modules | `trace-matrix.json` | Traceability |

#### Validators

The Validator runs two classes of checks:
- BA Validator - check BA against Business Architecture
- Design Validatior - check Design Architecture against BA and Architecture
- Module Validator - based on module type against Design Architecture
- Generate Missing Modules (if asked)



### architecture.json â€” Rules to validate against

Defines the architectural constraints for this project: layer taxonomy, dependency rules, component structure. Tools use this to validate that modules are correctly classified and that dependency directions are respected.

> **Status:** `architecture.json` is canonical; `architecture.json` is optional for structured tech settings.

---

### methodology.json â€” Completeness checklist per phase

Defines the phases of the project pipeline and the artifacts each phase must produce. Tools use this to check whether a phase is complete and what is still missing.

> **Status:** `methodology.json` is canonical for completeness validation.

---

## MDT Tools (more to come later - how to use MDT not here)

---

## AI Navigation Flow

The AI engine should treat the project as self-describing and navigate in a deterministic order.

### Start Here

1. **`configuration.json`** Ã¢â‚¬â€ resolve all paths and naming patterns.
2. **`methodology.json`** Ã¢â‚¬â€ understand phases, required artifacts, and subject rules.
3. **`architecture.json`** Ã¢â‚¬â€ load layer rules, dependency constraints, and system boundaries.

### Discovery Flow

0. **Scan Root files** this one, configuration.json, architecture.json, and methodology.json. and application.md.
1. **Scan subject structure** (if subject folders or tags exist) and map subjects to artifact locations.
2. **Load Business Analysis artifacts** Ã¢â‚¬â€ `application.md`, requirements, and use cases.
3. **Load Design artifacts** Ã¢â‚¬â€ entities, modules, and trace matrix.
4. **Load Build artifacts** Ã¢â‚¬â€ SQL outputs and generated-manifest (if present).
5. **Load Work items** Ã¢â‚¬â€ open work items to pick up current tasks or gaps.

### Validation Loop

1. **Completeness** Ã¢â‚¬â€ check all required artifacts for the current phase.
2. **Compliance** Ã¢â‚¬â€ enforce naming, location, and cross-reference rules.
3. **Traceability** Ã¢â‚¬â€ ensure requirements map to use cases, entities, modules, tests, and code.
4. **Report** Ã¢â‚¬â€ write a `validation-report.json` with findings and suggested fixes.

### Output Rules

- Never assume folder names; always follow `configuration.json`.
- Prefer canonical JSON artifacts; treat Markdown as narrative or published outputs unless explicitly canonical.
- If artifacts are missing, report gaps rather than inventing content.


## Design Principle

MDT is intentionally stateless with respect to projects. The project is self-describing. The tool is interchangeable. This means:

- A project can be validated by any MDT version.
- The tool can be upgraded without touching project files.
- Teams can fork and customise `methodology.json` and `architecture.json` to fit their process â€” MDT adapts.


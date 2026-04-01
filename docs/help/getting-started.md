# How to Use MDE

MDE is a command-driven, AI-orchestrated model-driven engineering framework.
You control the lifecycle by issuing explicit commands. AI executes the work through a governed skill pipeline.

There are two ways to work with MDE:

1. **IDE mode** — using Claude Code (or any AI coding assistant) directly inside VS Code, with no browser needed.
2. **Viewer mode** — running the local web viewer alongside your IDE for a visual project dashboard.

---

## Mode 1 — IDE Only (Claude Code + VS Code, no viewer)

This is the primary working mode. All interaction happens through the Claude Code chat panel inside VS Code.

### Setup

1. Open the project root folder (`c:\ai-mde` or your host project) in VS Code.
2. Open the Claude Code panel (side panel or `Ctrl+Shift+P → Claude Code`).
3. Confirm `CLAUDE.md` is present at the project root — it bootstraps the AI with MDE instructions.

No server, no browser, no additional tools needed.

### How commands work

Type commands directly in the Claude Code chat — natural language or the exact command name. The orchestrator resolves them.

```
Perform Business Analysis
Build System Design
Validate Requirements
Generate LDM
Show Phase Status
```

You can also use the canonical command name:

```claude
perform_business_analysis
build_system_design
validate_requirements
```

To see all available commands, ask:

```claude
List all MDE commands
```

### Typical session flow

**Phase 1 — Project Initiation**
```claude
Select Methodology
Select Architecture
```

**Phase 2 — Business Analysis**

1. Drop source material into `ba/discovery/` then run:
```claude
Perform Business Analysis
```
2. Review and answer questions in `project/questions.json`, then:
```claude
Validate Requirements
```

**Phase 3 — System Design**

3. Build the system design and derive the data model:
```claude
Build System Design
Generate LDM
Generate Modules
Generate UI Outline
```
4. Validate the architecture:
```claude
Validate Architecture
```

**Phase 4 — Development**

5. Generate source code and supporting assets:
```claude
Generate Source Code
Generate UI Source Code
Generate Sample Data
```

**Phase 5 — Governance and Validation**

6. Run end-to-end checks and generate documentation:
```claude
Validate Traceability
Validate Design Compliance
Generate Diagrams
Generate Documentation
Export Docs
```

7. Check current phase and available next commands at any point:
```claude
Show Phase Status
```

**Phase 6 — Change Management**

8. To process a change request, drop the request file into `Requests/` then run:
```claude
Evaluate Change Request
```
The orchestrator will walk through the mandatory 6-step change workflow.

### Where AI reads from and writes to

**Business Analysis**

| Artifact | Path |
|---|---|
| Source material to analyze | `ba/discovery/` |
| Requirements baseline | `ba/requirements.md` |
| Analysis status | `ba/analysis-status.md` |
| Glossary | `ba/glossary.md` |
| Use cases | `ba/use-cases.md` |

**System Design**

| Artifact | Path |
|---|---|
| Architecture document | `design/architecture.md` |
| Logical data model | `design/ldm.md` |
| Module catalog | `design/modules/` |
| UI outline | `design/ui-outline.md` |
| SQL schema | `design/schema.sql` |
| Entity definitions | `design/entities/` |

**Development**

| Artifact | Path |
|---|---|
| Generated source code | `src/` (per module) |
| Generated UI code | `ui/src/` |
| Sample data | `design/sample-data/` |

**Governance**

| Artifact | Path |
|---|---|
| Generated diagrams | `docs/diagrams/` |
| Exported documentation | `output/` |
| Validation reports | `project/validation/` |

**Change Management**

| Artifact | Path |
|---|---|
| Change request source files | `Requests/` |
| Change request artifacts | `project/change-requests/{request-slug}/` |

**Project State**

| Artifact | Path |
|---|---|
| Active questions | `project/questions.json` |
| Open issues | `project/open-queue.json` |
| Application definition | `application/application.json` |
| Project state | `project/project-state.json` |
| Command log | `project/logs/command-log.jsonl` |

All outputs are written to these paths. You can read, edit, and commit them like any other files.

### Tips for IDE mode

**Business Analysis**
- Drop new source files into `ba/discovery/` before running `Perform Business Analysis`.
- After AI generates questions in `project/questions.json`, answer them directly in the file, then re-run `Validate Requirements`.

**System Design**
- Run `Build System Design` before `Generate Modules` — module generation depends on the architecture document.
- Run `Generate LDM` before `Generate SQL` — the physical schema is derived from the logical model.
- Use `Validate Architecture` after design changes to catch compliance issues early.

**Development**
- Run `Generate Modules` before `Generate Source Code` — the module catalog drives code generation.
- `Generate Sample Data` is useful for populating a local dev database after schema generation.

**Governance**
- Run `Validate Traceability` before exporting — it catches gaps between requirements, design, and code.
- `Generate Diagrams` produces state, workflow, module interaction, BPMN, and data flow diagrams from the current artifacts.
- `Show Phase Status` is available at any point — shows what is complete, what is missing, and what commands are valid next.

**Change Management**
- Drop the change request file into `Requests/` before running `Evaluate Change Request`.
- The orchestrator enforces a mandatory 6-step sequence — do not skip steps.
- Each change request gets its own folder under `project/change-requests/` with a full audit trail.

**General**
- The command log at `project/logs/command-log.jsonl` records every AI command run — useful for reviewing what was done and auditing outputs.

---

## Mode 2 — With the Viewer

The viewer is a local web app that gives you a visual dashboard of your project artifacts, phase status, and outputs. Use it alongside Claude Code in VS Code — the two do not conflict.

### Start the viewer

From the project root:

```bash
npm run viewer -- -- --root=c:\dev\my-project 
```
or 
```bash

ts-node web/app.ts --root=c:\dev\my-project

```


The viewer starts at **http://localhost:4000** and opens automatically in your default browser.

### What the viewer shows

![Business Requirements](./images/viewer-BA-1.png)


- **Phase status** — which phases are complete, in progress, or blocked
- **Artifact library** — browse generated documents (requirements, architecture, LDM, module specs, etc.)
- **Command history** — what commands have run and their status
- **Open questions and issues** — current items in `project/questions.json` and `project/open-queue.json`
- **Traceability** — links from requirements through design to generated outputs

### Workflow with viewer open

The viewer reads from the same project files that Claude Code writes to. No sync step is needed — refresh the browser after each AI command to see updated outputs.

```
1. Open VS Code + Claude Code panel
2. In a terminal: npm run viewer  → opens http://localhost:4000
3. Issue commands through Claude Code chat
4. Refresh the viewer to see results
```

### When to use the viewer

- Reviewing AI-generated artifacts with stakeholders (share screen on the browser view)
- Checking phase readiness before moving to the next phase
- Browsing the artifact library without reading raw files
- Reviewing open questions and validation issues at a glance

---

## Choosing a mode

| Situation | Recommended mode |
|---|---|
| Active development, writing commands, iterating fast | IDE only |
| Reviewing outputs, sharing with non-technical stakeholders | Viewer |
| Full working session | Both — IDE for commands, viewer for review |
| Headless / CI pipeline | IDE only (no viewer needed) |

---

## Scripts

Node.js utilities for project setup, maintenance, and validation. Run from the terminal — not by the AI.

```bash
node scripts/<script-name>.js
# or
npm run <script-name>
```

### Setup

| Script | What it does |
|---|---|
| `create-project.js` | Scaffolds a new project folder from `app-template/` and injects the ai-mde install path |

### Validation

| Script | What it does |
|---|---|
| `validate-config.js` | Validates `configuration.json` — checks required fields and path semantics |
| `validate-architecture.js` | Validates project modules against architecture rules |
| `validate-requirements.js` | Validates the requirements artifact against the schema |
| `validate-traceability.js` | Checks end-to-end trace links from requirements to code |
| `validate-mde-consistency.js` | Checks internal consistency across MDE artifacts |
| `validate-app-structure.js` | Validates the project folder structure |

### Documentation

| Script | What it does |
|---|---|
| `syncAIInstrToDocs.js` | Reads `ai-instructions/` JSON and generates human-readable markdown in `docs/ai-instructions/` |
| `gen_docs.js` | Generates project documentation outputs |
| `generate-command-zip.js` | Packages commands for distribution or debugging |

### Debug

| Script | What it does |
|---|---|
| `debug/build-skill-debug-bundle.js` | Packages skill inputs for offline debugging |
| `debug/run-skill-api.js` | Runs a skill directly via the AI API — bypasses the IDE |
| `debug/check-api-key.js` | Verifies the AI API key is configured and reachable |

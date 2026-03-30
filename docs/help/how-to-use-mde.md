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

```
Initiate Project
```
1.  Drop source material into ba/discovery/ then run:
```claude
Perform Business Analysis
```

2.  Review and answer questions in project/questions.json, then:
```
Validate Requirements
```
3.  Move to design
```
Build System Design

Generate LDM
```
4.  Inspect current phase and what is allowed next
```
Show Phase Status
```

### Where AI reads from and writes to

| Input | Path |
|---|---|
| Source material to analyze | `ba/discovery/` |
| Requirements baseline | `ba/requirements.md` |
| Analysis status | `ba/analysis-status.md` |
| Active questions | `project/questions.json` |
| Open issues | `project/open-queue.json` |
| Application definition | `application/application.json` |
| Project state | `project/project-state.json` |
| Command log | `project/logs/command-log.json` |

All outputs are written to these paths. You can read, edit, and commit them like any other files.

### Tips for IDE mode

- Drop new source files into `ba/discovery/` before running `Perform Business Analysis`.
- After AI generates questions in `project/questions.json`, answer them directly in the file, then re-run validation.
- Ask `Show Phase Status` to see what is complete, what is missing, and what commands are available next.
- The command log at `project/logs/command-log.json` records every AI command run — useful for reviewing what was done.

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

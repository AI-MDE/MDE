# Getting Started

MDE is command-driven and AI-orchestrated. You issue commands in Claude Code chat — the AI executes the work through a governed skill pipeline, writing all artifacts into your project repository.

---

## Setup

1. Open your project folder in VS Code
2. Open the Claude Code panel (`Ctrl+Shift+P → Claude Code`)
3. Confirm `CLAUDE.md` is present at the project root

Type commands in plain English — the orchestrator resolves them:

```
Perform Business Analysis
Build System Design
Show Phase Status
```

> Run `Show Phase Status` at any point to see what is complete, what is missing, and what commands are valid next.

---

## Lifecycle phases

| Phase | What it produces | |
|---|---|---|
| 1. Project Initiation | Methodology, architecture selection | [→](./phases/01-project-initiation.md) |
| 2. Business Analysis | Requirements, use cases, glossary, rules | [→](./phases/02-business-analysis.md) |
| 3. System Design | Architecture, LDM, modules, SQL, UI outline | [→](./phases/03-system-design.md) |
| 4. Development | Source code, UI code, sample data | [→](./phases/04-development.md) |
| 5. Governance & Validation | Validation reports, diagrams, documentation | [→](./phases/05-governance.md) |
| 6. Change Management | Impact analysis, governed change pipeline | [→](./phases/06-change-management.md) |

---

## Tools

**Viewer** — browser dashboard at `http://localhost:4000`:
```bash
npm run viewer -- --root=<your-project-path>
```

**Scripts** — setup, validation, doc sync:
```bash
npm run          # lists all available scripts
npm run mcp:register   # register the MCP server (optional)
```

---

[Phase 1 — Project Initiation →](./phases/01-project-initiation.md)

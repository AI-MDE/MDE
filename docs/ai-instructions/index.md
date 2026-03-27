# AI Instructions — Overview

This folder contains markdown documentation generated from the JSON source files in `mde/ai-instructions/`.
All files here are produced by [`mde/scripts/syncAIInstrToDocs.js`](../../scripts/syncAIInstrToDocs.js) and should not be edited by hand.

## Contents

| Document | Description |
|----------|-------------|
| [orchestrator.md](orchestrator.md) | Full orchestrator reference — phases, pipeline, error handling, response contract |
| [commands/](commands/) | One doc per command (22 total) |
| [skills/](skills/) | One doc per skill (19 total) |

To regenerate:
```bash
node mde/scripts/syncAIInstrToDocs.js
```

---

## What the AI Instruction System Is

`mde/ai-instructions/` is **not executable code**. There is no runtime engine that parses and enforces it. It is a set of structured instruction documents designed to be read by an AI model and used to govern the AI's own behavior during a session.

### How it works

The chain is:

1. `CLAUDE.md` (or `AGENT.md`) is auto-loaded at session start — it tells the AI to read `orchestrator.json` and the command/skill registries as the source of truth.
2. The AI reads the orchestrator and registries into its context window.
3. From that point forward, the AI self-governs according to those rules — resolving commands correctly, following the 9-step pipeline, blocking on missing prerequisites, and formatting responses per the response contract.

### Does the AI actually follow it?

Conditionally — yes, but with caveats:

- A capable model will generally respect the phase rules, execution pipeline, and response contract because it read them and treats them as authoritative instructions.
- There is **no enforcement mechanism**. If the AI hallucinates, skips a step, or invents an artifact, nothing catches it. The system relies entirely on the model's instruction-following fidelity.
- Adherence is stronger for well-structured rules (e.g., response contract fields, error handling actions) and weaker for subtle rules (e.g., "never guess destructive commands") that depend on judgment.

### Practical significance

- **Reproducibility** — any session that loads these files should behave consistently across runs and models.
- **Team contract** — anyone reading them knows exactly what the AI is supposed to do and can hold it accountable.
- **Behavioral control point** — changing phase rules, adding commands, or adjusting error handling in the JSON directly changes what the AI will do. The JSON is the thing to edit; this folder documents the result.

### Relationship between JSON and docs

| Layer | Path | Purpose |
|-------|------|---------|
| Source of truth | `mde/ai-instructions/*.json` | What the AI reads and obeys |
| Generated docs | `mde/docs/ai-instructions/` | Human-readable reference, kept in sync by script |

---

## Architectural Decisions

### Why paths are hardcoded in skill and command files

File paths in `skills/*.json` and `commands/*.json` are hardcoded (e.g. `../../ba/requirements.md`) rather than using logical names (e.g. `requirements_baseline`) resolved from the orchestrator's `inputs` map.

This is intentional. The system operates in two modes:

| Mode | Path resolution | Reliability |
|------|----------------|-------------|
| **API mode** (`run-skill-api.js`) | Tool resolves paths before the AI sees them | High — deterministic |
| **Console mode** (Claude Code, Gemini) | AI resolves paths at runtime from context | Medium — model-dependent |

In console mode the AI reads instruction files directly. If it had to resolve logical names from the orchestrator's `inputs` map, it would be one more indirection that could fail — especially in long sessions where early context fades. Hardcoded paths are seen directly and cannot be misresolved.

### Planned: generated skill and command files

When the workspace structure changes, skill and command files should ideally be regenerated with updated paths rather than edited by hand. The intended future pipeline is:

```
methodology.json   ──┐
configuration.json ──┼──► generateOrchestrator.js ──► orchestrator.json
                      │
configuration.json ──┴──► generateSkills.js ──► skills/*.json
                                     │
                                     └──► syncAIInstrToDocs.js ──► docs/
```

Until `generateSkills.js` exists, path changes in `configuration.json` require manually updating the affected skill and command files.

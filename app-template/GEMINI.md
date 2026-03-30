# Gemini Bootstrap

Use this file as the entry point for this workspace.

## Path Resolution
*** IMPORTANT ***
YOU MUST NOT WRITE ANY FILES OUTSIDE OF THE PROJECT ROOT, AND ONLY AS SPECIFIED BY `configuration.json`.
-------------------------
When prompting users for file writes, show the full path.

All file paths in commands and skills are relative to the project root (the folder containing this file and `configuration.json`).
When a skill input says `{ "from": "config.X.Y" }`, read `configuration.json` at key path `X.Y` to get the resolved path. If the key is absent, use the `default` value.

## Source Of Truth
Read these files first:
1. `{ai-mde-path}/ai-instructions/commands/` (one JSON file per command)
2. `{ai-mde-path}/ai-instructions/skills/` (one JSON file per skill)
3. `{ai-mde-path}/ai-instructions/orchestrator.json`

## Workspace Layout
- `{ai-mde-path}/`
  - `ai-instructions/`
    - `orchestrator.json` orchestration rules
    - `commands/` source command definitions, one file per command
    - `skills/` source skill definitions, one file per skill

## Startup Rules
- Do not assume root-level `GEMINI.md` exists.
- Resolve user requests through `{ai-mde-path}/ai-instructions/commands/*.json`.
- Follow `{ai-mde-path}/ai-instructions/orchestrator.json` and the mapped skill in `{ai-mde-path}/ai-instructions/skills/*.json`.
- Command source files live in `{ai-mde-path}/ai-instructions/commands/`.
- Skill source files live in `{ai-mde-path}/ai-instructions/skills/`.
- No merge step is required for skills; runtime reads `{ai-mde-path}/ai-instructions/skills/*.json` directly.

# Claude Bootstrap

Use this file as the entry point for this workspace.

## Source Of Truth
Read these files first:
1. `mde/ai-instructions/commands/` (one JSON file per command)
2. `mde/ai-instructions/skills/` (one JSON file per skill)
3. `mde/ai-instructions/orchestrator.json`

## Path Resolution
All file paths in commands and skills are relative to the project root (the folder containing this file and `configuration.json`).
When a skill input says `{ "from": "config.X.Y" }`, read `configuration.json` at key path `X.Y` to get the resolved path. If the key is absent, use the `default` value.

## Workspace Layout
- `mde/` — MDE framework (commands, skills, orchestrator, architecture, tools)
- `ba/` — business analysis artifacts
  - `discovery/` — drop new source material here before running analysis
  - `analyzed/` — processed source material
  - `requirements.md` — requirements baseline
  - `use-cases/` — one file per use case
- `design/` — design artifacts
  - `entities/` — one `ent-*.json` per entity
  - `modules/` — module catalog and definitions
  - `sql/` — schema files
- `project/` — project state, questions, open issues, command log
- `application/` — application definition
- `src/` — generated source code
- `output/` — generated zips and docs

## Startup Rules
- Resolve user requests through `mde/ai-instructions/commands/*.json`
- Follow `mde/ai-instructions/orchestrator.json` for phase rules and execution pipeline
- Skill source files live in `mde/ai-instructions/skills/`
- Treat `ba/discovery/` as the inbox for new inputs
- Treat `project/questions.json` and `project/open-queue.json` as active BA working files

## Slash Command Contract
- If user input starts with `/mde `, treat it as an MDE command invocation
- `/mde list` — list all available commands
- `/mde <command_name>` — execute that command

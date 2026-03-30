# Claude Bootstrap

Use this file as the entry point for this workspace.

## Path Resolution
All file paths in commands and skills are relative to the project root (the folder containing this file and `configuration.json`).
When a skill input says `{ "from": "config.X.Y" }`, read `configuration.json` at key path `X.Y` to get the resolved path. If the key is absent, use the `default` value.

## Source Of Truth
Read these files first:
1. `{ai-mde-path}/ai-instructions/commands/` (one JSON file per command)
2. `{ai-mde-path}/ai-instructions/skills/` (one JSON file per skill)
3. `{ai-mde-path}/ai-instructions/orchestrator.json`

## Startup Rules
- Resolve user requests through `{ai-mde-path}/ai-instructions/commands/*.json`
- Follow `{ai-mde-path}/ai-instructions/orchestrator.json` for phase rules and execution pipeline
- Skill source files live in `{ai-mde-path}/ai-instructions/skills/`

## Slash Command Contract
- If user input starts with `/mde `, treat it as an MDE command invocation
- `/mde list` — list all available commands
- `/mde <command_name>` — execute that command

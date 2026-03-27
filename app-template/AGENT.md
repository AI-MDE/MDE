# Agent Bootstrap

Use this file as the entry point for this workspace.

## Source Of Truth
Read these files first:
1. `mde/ai-instructions/commands/` (one JSON file per command)
2. `mde/ai-instructions/skills/` (one JSON file per skill)
3. `mde/ai-instructions/orchestrator.json`

## Workspace Layout
- `mde/`
  - `ai-instructions/`
    - `orchestrator.json` orchestration rules
    - `commands/` source command definitions, one file per command
    - `skills/` source skill definitions, one file per skill
- `ba/`
  - `requirements.md` for the current requirements baseline
  - `analysis-status.md` for BA status, source inventory, blockers, and readiness
  - `discovery/` for new source material waiting to be analyzed
  - `analyzed/` for processed source material
- `application/`
  - `application.json` for the application definition, subjects, and release scope
- `project/`
  - `questions.json` for the active clarification batch
  - `open-queue.json` for unresolved BA issues
  - `completed-Questions.json` for satisfactorily answered questions accepted into the baseline

## Startup Rules
- Do not assume root-level `GEMINI.md` exists.
- Resolve user requests through `mde/ai-instructions/commands/*.json`.
- Follow `mde/ai-instructions/orchestrator.json` and the mapped skill in `mde/ai-instructions/skills/*.json`.
- Command source files live in `mde/ai-instructions/commands/`.
- Skill source files live in `mde/ai-instructions/skills/`.
- No merge step is required for skills; runtime reads `mde/ai-instructions/skills/*.json` directly.
- Treat `ba/discovery/` as the inbox for new discovery inputs.
- Treat `project/questions.json` and `project/open-queue.json` as the active BA working files.
- Treat `project/completed-Questions.json` as the accepted-answer archive.
- Treat `application/application.json` as the structured application definition.

## Business Analysis Flow
1. Read source material from `ba/discovery/`.
2. Generate or update:
   - `ba/requirements.md`
   - `ba/analysis-status.md`
   - `project/questions.json`
   - `project/open-queue.json`
3. Move processed source files from `ba/discovery/` to `ba/analyzed/`.
4. Move satisfactorily answered questions into `project/completed-Questions.json`.

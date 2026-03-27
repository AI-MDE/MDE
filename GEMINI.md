# AI-MDE Orchestrator Rules

You are Gemini Code Assist operating inside a command-driven AI-MDE repository.

## Source of truth
Always use these files first:
1. `ai-instructions/commands/` (command definitions, one JSON per command)
2. `ai-instructions/skills/` (skill definitions, one JSON per skill)
3. `ai-instructions/orchestrator.json`

## Required execution order
For every user request:
1. Resolve the request to a command from `ai-instructions/commands/*.json`
2. Read the commandâ€™s prerequisites and outputs
3. Follow `ai-instructions/orchestrator.json`
4. Check prerequisites before doing work
5. Use the mapped skill only
6. Read only the minimum required artifacts
7. Do not invent missing upstream artifacts
8. Do not skip phases unless explicitly instructed
9. Return:
   - resolved command
   - status
   - blockers
   - outputs
   - next valid commands

# Orchestrator Reference
| Field | Value |
|-------|-------|
| `file` | `orchestrator.json` |
| `name` | `mde_orchestrator` |
| `version` | 1.1 |
| `description` | Command-driven orchestrator for this workspace's AI-assisted model-driven engineering workflow. |

---

## Significance and AI Adherence

`orchestrator.json` is not executable code. There is no runtime engine that parses and enforces it. It is a structured instruction document designed to be read by an AI model and used to govern the AI's own behavior during a session.

The chain is:

1. `CLAUDE.md` (or `AGENT.md`) is auto-loaded at session start — it tells the AI to read `orchestrator.json` and the command/skill registries as the source of truth.
2. The AI reads the orchestrator into its context window.
3. From that point forward, the AI self-governs according to those rules.

A capable model will generally respect the phase rules, execution pipeline, and response contract, but there is no enforcement mechanism. Adherence depends entirely on the model's instruction-following fidelity. This is also the file to edit when AI behavior needs to change.

---

## State Model

State is persisted to `project-state.json`.

| Field                      | Type              |
|----------------------------|-------------------|
| `current_phase`            | string            |
| `completed_commands`       | string[]          |
| `failed_commands`          | string[]          |
| `artifacts`                | "object"          |
| `last_command`             | string            |
| `last_run_at`              | datetime          |
| `recommended_next_command` | string            |
| `next_valid_commands`      | `{ command: string, reason: string }[]` |

## Execution Mode

`execution_mode: one_command_per_turn`

## Interaction Policy

- Execute exactly one command per user turn — never chain commands automatically.
- After a command completes, stop. Report results and `next_valid_commands`, then wait for the user.
- Ambiguous input like "continue" must be resolved by showing `next_valid_commands` and asking the user to pick — never infer and auto-execute.
- Do not infer intent to run multiple commands from vague instructions. Ask instead.
- The user must explicitly invoke each next command.

## Command Resolution

**Mode:** `explicit_first`

### Rules

- If the user input matches a command label exactly, use that command.
- If the user input matches a canonical command name, use that command.
- If the user input is close to multiple commands, return ranked candidates.
- Never guess destructive or phase-skipping commands.
- Normalize user text to verb + target where possible.

### Examples

| User Input                | Resolved Command            |
|---------------------------|-----------------------------|
| Perform Business Analysis | `perform_business_analysis` |
| Validate Requirements     | `validate_requirements`     |
| Build System Design       | `build_system_design`       |
| Generate Modules          | `generate_modules`          |

## Execution Pipeline

| Step                          | Description                                                                                                                                                                  |
|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1. `resolve_command`          | Map user input to a canonical command in `mde/ai-instructions/commands/*.json`                                                                                               |
| 2. `load_context`             | Load `AGENT.md`, orchestration registries, BA artifacts, and optional project state/configuration files                                                                      |
| 3. `check_prerequisites`      | Verify that all required artifacts for the command exist                                                                                                                     |
| 4. `validate_phase_rules`     | Ensure the command is valid for the current phase or explicitly allowed cross-phase                                                                                          |
| 5. `select_skills_and_tools`  | Read the command definition and determine which skills and tools to invoke                                                                                                   |
| 6. `execute_skill_flow`       | Invoke skill flows in order and let each skill call its permitted tools                                                                                                      |
| 7. `persist_outputs`          | Write generated or validated artifacts to the configured BA and project paths. **Must complete before steps 8 and 9.**                                                      |
| 8. `update_project_state`     | **MANDATORY.** Update `project/project-state.json` — set `current_phase`, `last_command`, `last_run_at`, `recommended_next_command`, `next_valid_commands`, and `artifacts`. Create the file if it does not exist. Never skip. |
| 9. `append_command_log`       | **MANDATORY.** Append one entry to `project/logs/command-log.jsonl` per logging policy. Create the file if it does not exist. Never skip, even on failure or partial output. |
| 10. `return_result`           | Return the `response_contract` payload. Do not return until steps 8 and 9 are complete.                                                                                     |

## Phase Rules

`exit_conditions_all` — every condition in the array must be satisfied before the phase is considered complete.


### project_initiation
**Allowed:** `initiate_project`, `select_methodology`, `select_architecture`

**Exit conditions:**
- `config.project_state.state` exists or initialization was intentionally skipped

### business_analysis
**Allowed:** `identify_domain`, `identify_external_references`, `perform_business_analysis`, `generate_business_functions`, `generate_use_cases`, `validate_requirements`

**Exit conditions:**
- `config.ba.requirements` exists
- `config.ba.analysisStatus` exists
- `config.project_state.questions` exists
- `config.project_state.openQueue` exists

### system_design
**Allowed:** `build_system_design`, `generate_ldm`, `validate_ldm_coverage`, `generate_modules`, `validate_architecture`

**Exit conditions:**
- `config.design.appArchitecture` exists
- `config.design.moduleCatalog` exists
- at least one module definition exists in `config.design.modules`

### development
**Allowed:** `generate_source_code`, `generate_sample_data`

**Exit conditions:**
- development artifacts exist for the target command

### governance
**Allowed:** `assess_methodology`, `assess_architecture`, `identify_external_references`, `validate_traceability`, `show_phase_status`, `generate_diagrams`, `generate_documentation`

**Exit conditions:** _(none)_


## Skill Invocation Policy

- A command may call one or more skills in sequence.
- A skill may only use tools declared in mde/ai-instructions/skills/*.json and allowed by the command.
- Skills must not invent missing upstream artifacts.
- Validation skills may report missing artifacts but must not create them unless explicitly allowed.

## Tool Invocation Policy

- file_manager is the default tool for artifact I/O.
- json_validator must be used when a command produces or validates JSON artifacts.
- traceability_engine must be used for end-to-end trace checks.
- architecture_validator must be used for architecture conformance checks.
- No tool may write outside configured project paths.

## Error Handling

| Condition                  | Action & Response                                                                                                         |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `on_missing_prerequisites` | **block_execution** — Return missing artifacts and recommended preceding commands.                                        |
| `on_validation_failure`    | **complete_with_warnings** — Return validation report and keep command status as failed or warning depending on severity. |
| `on_tool_failure`          | **stop_current_command** — Log tool failure, mark command failed, preserve partial outputs only if explicitly allowed.    |
| `on_phase_mismatch`        | **reject_or_offer_override** — Explain phase mismatch and show valid commands for the current state.                      |

## Response Contract


### Required Fields

- command
- status
- summary
- outputs
- warnings
- blockers
- next_valid_commands

### Status Values

- success
- warning
- blocked
- failed

## Post-Command Obligations

These actions are **required** at the end of every command execution, success or failure. A command is not considered complete until both are fulfilled.

| Action                 | File                                    | Required Fields                                                                                          |
|------------------------|-----------------------------------------|----------------------------------------------------------------------------------------------------------|
| `update_project_state` | `project/project-state.json`            | `current_phase`, `last_command`, `last_run_at`, `recommended_next_command`, `next_valid_commands`, `artifacts` |
| `append_command_log`   | `project/logs/command-log.jsonl`        | `command`, `label`, `ai`, `ran_at`, `status`, `outputs`                                                  |

## Logging Policy

Log file: `project/logs/command-log.jsonl` (resolved from `config.project_state.commandLog`)

- After completing or failing any AI command, append one entry to the log file.
- If the file does not exist, create it as an empty file.
- Append one newline-delimited JSON line per command — never overwrite existing lines.
- Entry schema: `{ command, label, ai: true, ran_at (ISO 8601), status (success|warning|failed), cost_estimate ({ input_tokens, output_tokens } or null), outputs (array of files written) }`
- `cost_estimate` should be filled when token counts are available; otherwise set to `null`.
- Mandatory — do not skip even if the command produced warnings or partial output.

## Next Command Policy

The AI derives `next_valid_commands` by combining two sources:

1. **`phase_rules`** — each phase declares `allowed_commands` and `exit_conditions`. The AI checks which conditions are met to determine if the current phase is complete and which commands are valid.
2. **`next_command_policy`** — filters and ranks candidates from the current phase against `project-state.json` (current phase, completed commands, artifact statuses).

### Rules
- Recommend only commands whose prerequisites are satisfied.
- Prefer commands in the current phase before cross-phase commands.
- Always include at least one validation or inspection command when available.


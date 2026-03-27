# Orchestrator Reference
| Field | Value |
|-------|-------|
| `file` | `mde/ai-instructions/orchestrator.json` |
| `name` | `mdt_orchestrator` |
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

## Inputs

| Key                      | Path                                     |
|--------------------------|------------------------------------------|
| `command_registry`       | `mde/ai-instructions/commands`           |
| `skills_registry`        | `mde/ai-instructions/skills`             |
| `agent_bootstrap`        | `AGENT.md`                               |
| `requirements_baseline`  | `../../ba/requirements.md`               |
| `analysis_status`        | `../../ba/analysis-status.md`            |
| `discovery_folder`       | `../../ba/discovery`                     |
| `analyzed_folder`        | `../../ba/analyzed`                      |
| `active_question_batch`  | `../../project/questions.json`           |
| `open_queue`             | `../../project/open-queue.json`          |
| `completed_questions`    | `../../project/completed-Questions.json` |
| `application_definition` | `../../application/application.json`     |
| `project_state`          | `../../project/project-state.json`       |
| `command_log`            | `../../project/logs/command-log.json`    |
| `configuration`          | `../../configuration.json`               |
| `methodology`            | `../../project/methodology.json`         |

## State Model

State is persisted to `../../project/project-state.json`.

| Field                      | Type              |
|----------------------------|-------------------|
| `current_phase`            | string            |
| `completed_commands`       | string[]          |
| `failed_commands`          | string[]          |
| `artifacts`                | "object"          |
| `last_command`             | string            |
| `last_run_at`              | datetime          |
| `recommended_next_command` | string            |
| `next_valid_commands`      | [object Object][] |

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

| Step                         | Description                                                                                                                                                       |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1. `resolve_command`         | Map user input to a canonical command in mde/ai-instructions/commands/*.json                                                                                      |
| 2. `load_context`            | Load AGENT.md, orchestration registries, BA artifacts, and optional project state/configuration files                                                             |
| 3. `check_prerequisites`     | Verify that all required artifacts for the command exist                                                                                                          |
| 4. `validate_phase_rules`    | Ensure the command is valid for the current phase or explicitly allowed cross-phase                                                                               |
| 5. `select_skills_and_tools` | Read the command definition and determine which skills and tools to invoke                                                                                        |
| 6. `execute_skill_flow`      | Invoke skill flows in order and let each skill call its permitted tools                                                                                           |
| 7. `persist_outputs`         | Write generated or validated artifacts to the configured BA and project paths                                                                                     |
| 8. `update_project_state`    | Record command completion or failure and always refresh recommended_next_command plus next_valid_commands (with reasons) if project/project-state.json is present |
| 9. `return_result`           | Return summary, outputs, warnings, blockers, and next valid commands                                                                                              |

## Phase Rules


### project_initiation
**Allowed:** `initiate_project`, `select_methodology`, `select_architecture`

**Entry conditions:** _(none)_

**Exit conditions:**
- ../../project/project-state.json exists or initialization was intentionally skipped

### business_analysis
**Allowed:** `identify_domain`, `identify_external_references`, `perform_business_analysis`, `generate_business_functions`, `generate_use_cases`, `validate_requirements`

**Entry conditions:** _(none)_

**Exit conditions:**
- ../../ba/requirements.md exists
- ../../ba/analysis-status.md exists
- ../../project/questions.json exists
- ../../project/open-queue.json exists

### system_design
**Allowed:** `build_system_design`, `generate_ldm`, `validate_ldm_coverage`, `generate_modules`, `validate_architecture`

**Entry conditions:**
- ../../ba/requirements.md exists
**Exit conditions:**
- ../../design/application_architecture.json exists
- ../../design/modules/module-catalog.json exists
- at least one module definition exists in design/modules/

### development
**Allowed:** `generate_source_code`, `generate_sample_data`

**Entry conditions:**
- schema.json exists for target module
**Exit conditions:**
- development artifacts exist for the target command

### governance
**Allowed:** `assess_methodology`, `assess_architecture`, `identify_external_references`, `validate_traceability`, `show_phase_status`, `generate_diagrams`, `generate_documentation`

**Entry conditions:** _(none)_

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

## Next Command Policy

- Recommend only commands whose prerequisites are satisfied.
- Prefer commands in the current phase before cross-phase commands.
- Always include at least one validation or inspection command when available.

## Sample Flows


### Perform Business Analysis
- **Command:** `perform_business_analysis`
- **Skills:** `business_analysis_from_sources`
- **Tools:** `file_manager`, `json_validator`
- **Outputs:**
- ../../ba/requirements.md
- ../../ba/analysis-status.md
- ../../project/questions.json
- ../../project/open-queue.json

### Validate Requirements
- **Command:** `validate_requirements`
- **Skills:** `requirements_validation`
- **Tools:** `file_manager`, `json_validator`, `traceability_engine`
- **Outputs:**
- {business-analysis}/requirements-validation-report.json

### Build System Design
- **Command:** `build_system_design`
- **Skills:** `system_design`
- **Tools:** `file_manager`
- **Outputs:**
- design/application_architecture.json
- design/modules/module-catalog.json

### Generate Modules
- **Command:** `generate_modules`
- **Skills:** `module_definition`
- **Tools:** `file_manager`, `json_validator`
- **Outputs:**
- design/modules/module-catalog.json
- design/modules/{moduleType}/module-{kebab-module}.json
- design/modules/{moduleType}/module-{kebab-module}.md

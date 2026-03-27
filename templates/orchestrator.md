# Orchestrator

- Name: `{{name}}`
- Version: `{{version}}`
- Description: {{description}}

## Inputs

- Command Registry: `{{inputs.command_registry}}`
- Skills Registry: `{{inputs.skills_registry}}`
- Agent Bootstrap: `{{inputs.agent_bootstrap}}`
- Project State: `{{inputs.project_state}}`

## Execution Pipeline

{{#execution_pipeline}}
- {{step}}. `{{name}}` - {{description}}
{{/execution_pipeline}}

## Phase Cycle

`project_initiation -> business_analysis -> system_design -> module_definition -> module_specification -> development -> governance`

## Phase Rules

{{#phase_rules_list}}
### {{phase}}

Allowed Commands: {{allowed_commands}}

{{#entry_conditions}}
- Entry: {{.}}
{{/entry_conditions}}
{{#exit_conditions}}
- Exit: {{.}}
{{/exit_conditions}}

{{/phase_rules_list}}

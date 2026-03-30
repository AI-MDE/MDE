# {{name}} v{{version}}

{{description}}

## Execution Pipeline

{{#execution_pipeline}}
{{step}}. **{{name}}** — {{description}}
{{/execution_pipeline}}

## Phase Rules

{{#phase_rules_list}}
### {{phase}}

**Allowed commands:** {{allowed_commands}}

{{#exit_conditions}}
- {{.}}
{{/exit_conditions}}

{{/phase_rules_list}}

## Interaction Policy

{{#interaction_policy.rules}}
- {{.}}
{{/interaction_policy.rules}}

## Tool Policy

{{#tool_invocation_policy.rules}}
- {{.}}
{{/tool_invocation_policy.rules}}

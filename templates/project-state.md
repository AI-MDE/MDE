# Project State

- Project: {{project}}
- Status: {{status}}
- Current Phase: {{current_phase}}
- Last Command: {{last_command}}
- Last Run: {{last_run_at}}
- Recommended Next Command: {{recommended_next_command}}

## Next Valid Commands
{{#next_valid_commands}}
- `{{command}}`: {{reason}}
{{/next_valid_commands}}

## Completed Commands
{{#completed_commands}}
- {{.}}
{{/completed_commands}}

## Failed Commands
{{#failed_commands}}
- {{.}}
{{/failed_commands}}

## Artifacts
`{{artifacts}}`

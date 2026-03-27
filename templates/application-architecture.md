# Application Architecture

**System:** {{system_name}}

{{#notes.onboarding-orchestrator}}
## Onboarding Orchestrator
{{notes.onboarding-orchestrator}}
{{/notes.onboarding-orchestrator}}

## Patterns
{{#patterns}}
- {{.}}
{{/patterns}}

## Modules
{{#modules}}
### {{name}}
{{description}}
{{#responsibilities}}
- {{.}}
{{/responsibilities}}

Requirements: {{#requirements}}{{.}} {{/requirements}}
{{/modules}}

## Dependency Rules
{{#dependency_rules}}
- {{.}}
{{/dependency_rules}}

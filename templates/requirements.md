# Requirements

## Project
- Name: {{project}}
- Version: {{version}}
- Date: {{date}}
- Status: {{status}}

## Goals
{{#goals}}
- {{.}}
{{/goals}}

## Scope
### Included
{{#scope.included}}
- {{.}}
{{/scope.included}}

### Excluded
{{#scope.excluded}}
- {{.}}
{{/scope.excluded}}

## Stakeholders
{{#stakeholders}}
- {{role}} ({{group}}) - {{interest}}
{{/stakeholders}}

## Constraints
{{#constraints}}
- {{id}}: {{description}}
{{/constraints}}

## Requirements
{{#requirements}}
- {{id}} ({{priority}}) {{description}}
  - Source: {{source}}
{{/requirements}}

## Risks
{{#risks}}
- {{id}}: {{description}}
  - Likelihood: {{likelihood}}, Impact: {{impact}}
  - Mitigation: {{mitigation}}
{{/risks}}

## Dependencies
{{#dependencies}}
- {{system}}: {{purpose}}
{{/dependencies}}

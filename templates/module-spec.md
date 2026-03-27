# Module Specification - {{moduleId}} {{moduleName}}

**Version:** {{version}}
**Date:** {{date}}
**Layer:** {{layer}}

## Overview
{{description}}

## Implements (Entities)
{{#implements}}
- {{.}}
{{/implements}}

## Responsibilities
{{#responsibilities}}
- {{.}}
{{/responsibilities}}

## Dependencies
{{#dependencies}}
- {{.}}
{{/dependencies}}

## Interfaces / APIs
**Base Path:** {{api.basePath}}

{{#api.endpoints}}
- {{method}} {{path}} ? {{description}}
{{/api.endpoints}}

## Rules
{{#rules}}
- {{id}}: {{name}}
  - Scope: {{scope}}
  - Condition: {{condition}}
  - Action: {{action}}
  - Else: {{elseAction}}
{{/rules}}

## Events
**Published**
{{#events.published}}
- {{.}}
{{/events.published}}

**Consumed**
{{#events.consumed}}
- {{.}}
{{/events.consumed}}

## Notes
{{notes}}


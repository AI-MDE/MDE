# Logical Data Model

## System
{{system_name}}

## Entities
{{#entities}}
### {{name}}
- Description: {{description}}
- Owner: {{owner_module}}
- Attributes: {{attributes}}
{{/entities}}

## Relationships
{{#relationships}}
- {{from}} {{type}} {{to}} ({{label}})
{{/relationships}}

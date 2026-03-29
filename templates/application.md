# {{application.name}}

- **Type:** {{application.type}}
- **Domain:** {{application.domain}}
- **Description:** {{application.description}}

## Actors

{{#application.actors}}
- **{{name}}** — {{description}}
{{/application.actors}}

## Scope

{{#application.scope}}
### In Scope
{{#inScope}}
- {{.}}
{{/inScope}}

### Out of Scope
{{#outOfScope}}
- {{.}}
{{/outOfScope}}
{{/application.scope}}

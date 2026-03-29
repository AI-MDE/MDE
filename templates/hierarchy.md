# {{title}}

{{#items}}
## {{id}} — {{name}}

{{#description}}> {{description}}

{{/description}}
{{#children}}
- **{{id}}** {{name}}{{#parentId}} _(parent: {{parentId}})_{{/parentId}}
{{#outcomes}}  - {{.}}
{{/outcomes}}
{{/children}}
{{/items}}

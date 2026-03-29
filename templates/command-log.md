# Command Log

{{#entries}}
## {{timestamp}} — {{command}}

- **Status:** {{status}}
- **AI:** {{ai}}
{{#duration}}- **Duration:** {{duration}}ms{{/duration}}
{{#outputs.length}}- **Outputs:** {{#outputs}}`{{.}}` {{/outputs}}{{/outputs.length}}

{{/entries}}

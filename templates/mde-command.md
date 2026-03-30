# {{label}}

| | |
|---|---|
| **Name** | `{{name}}` |
| **Phase** | {{phase}} |
| **Intent** | {{intent}} |
| **Calls** | {{calls}} |

{{#rules}}
## Rules

{{#rules}}
- {{.}}
{{/rules}}
{{/rules}}

{{#requires_list}}
## Requires

{{#requires_list}}
- **{{key}}** — `{{value}}`
{{/requires_list}}
{{/requires_list}}

{{#produces_list}}
## Produces

{{#produces_list}}
- **{{key}}** — `{{value}}`
{{/produces_list}}
{{/produces_list}}

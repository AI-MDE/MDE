# {{name}}

{{purpose}}

{{#inputs_list}}
## Inputs

| Key | Path |
|---|---|
{{#inputs_list}}
| **{{key}}** | `{{value}}` |
{{/inputs_list}}
{{/inputs_list}}

{{#outputs_list}}
## Outputs

| Key | Path |
|---|---|
{{#outputs_list}}
| **{{key}}** | `{{value}}` |
{{/outputs_list}}
{{/outputs_list}}

{{#rules}}
## Rules

{{#rules}}
- {{.}}
{{/rules}}
{{/rules}}

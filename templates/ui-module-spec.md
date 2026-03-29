# {{moduleName}}

| | |
|---|---|
| **ID** | {{moduleId}} |
| **Route** | `{{routePrefix}}` |
| **Entry** | `{{navigation.entryPoint}}` |
| **Users** | {{users}} |
| **Backend Modules** | {{backends}} |

{{purpose}}

{{#subNav}}
## Sub-Navigation

{{#subNav}}
- [{{label}}]({{route}})
{{/subNav}}

{{/subNav}}
## Pages

{{#pages}}
### {{name}}

| | |
|---|---|
| **Route** | `{{id}}` |
| **Pattern** | {{pattern}} |
| **Menu** | {{menuVisibleLabel}} |
| **Roles** | {{roles}} |
| **Business Function** | {{businessFunctionRef}} |
| **Requirements** | {{requirements}} |

{{purpose}}

{{#hasActions}}
**Actions:**
{{#actions}}
- {{label}} (`{{type}}`){{#navigatesTo}} → `{{navigatesTo}}`{{/navigatesTo}}
{{/actions}}

{{/hasActions}}
{{#hasFilters}}
**Filters:**
{{#filters}}
- {{field}} ({{type}})
{{/filters}}

{{/hasFilters}}
{{#hasValidation}}
**Validation:**
{{#validation}}
- `{{field}}` — {{rule}}: _{{message}}_
{{/validation}}

{{/hasValidation}}
{{#emptyState}}
> **Empty state:** {{emptyState}}

{{/emptyState}}
---
{{/pages}}

## Navigation Flows

{{#navigation.flows}}
- `{{from}}` → `{{to}}` via _{{via}}_
{{/navigation.flows}}

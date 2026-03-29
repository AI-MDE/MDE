# UI Module Catalog — {{application}}

## App Menu

| Order | Label | Icon | Entry Route |
| --- | --- | --- | --- |
{{#menu}}
| {{order}} | {{label}} | {{icon}} | `{{route}}` |
{{/menu}}

## Modules

{{#modules}}
### {{id}} — {{name}}

- **Route:** `{{routePrefix}}`
- **Purpose:** {{purpose}}
- **Users:** {{users}}
- **Backend Modules:** {{backends}}
- **Priority:** {{priority}}

{{/modules}}

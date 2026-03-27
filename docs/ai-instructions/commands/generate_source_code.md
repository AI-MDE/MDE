# Generate Source Code

| Field | Value |
|-------|-------|
| `name` | `generate_source_code` |
| `phase` | development |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- source_code_generation

## Requires

- ../../design/modules/<type>/<module>/schema.json
- ../../design/modules/<type>/<module>/rules.json
- ../../design/modules/<type>/<module>/state-machine.json
- ../../design/modules/<type>/<module>/api.yaml

## Produces

- ../../src/<layer>/**/*.ts
- generated-manifest.json

## Tools

- file_manager

## Rules

- Generate code from module specs
- Respect architecture layer rules

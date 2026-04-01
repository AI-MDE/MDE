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

## Tools

- file_manager

## Rules

- Generate code from module specs
- Respect architecture layer rules
- Generated methods in controller/service/domain/query_service/data_access layers must include method-level traceability docs with @requirement and @design_concern tags

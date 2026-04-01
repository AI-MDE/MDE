# Export Documentation

| Field | Value |
|-------|-------|
| `name` | `export_docs` |
| `phase` | governance |
| `intent` | generate |
| `ai` | `optional` |

---

## Calls

- docs_export

## Tools

- file_manager

## Rules

- Add export section to configuration.json if absent
- Generate scripts/exportDocs.js â€” must be runnable with node, no build step
- Patch package.json to add export:mkdocs and export:confluence scripts
- Add mustache and marked to devDependencies in package.json

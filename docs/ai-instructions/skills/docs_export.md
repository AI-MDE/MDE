# docs_export

| Field | Value |
|-------|-------|
| `name` | `docs_export` |
| `next_phase` | governance |

---

## Purpose

Generate a standalone Node.js script (scripts/exportDocs.js) that exports all viewer documents to MkDocs or Confluence. The script calls the running viewer's REST API to fetch the document tree, templates, and content â€” then renders each doc through its Mustache template and writes output files.

## Rules

- CRITICAL: Script must be pure CommonJS â€” no import/export, no TypeScript.
- CRITICAL: Use the viewer's /api/tree and /api/catalog to discover all docs â€” never hardcode paths.
- CRITICAL: Patch package.json by reading and merging â€” never overwrite.
- CRITICAL: Patch configuration.json by reading and merging â€” never overwrite existing keys.
- CRITICAL: Confluence auth credentials go in configuration.json with empty defaults â€” never hardcode tokens.
- Template rendering must use the mustache npm package (require('mustache')).
- Confluence HTML conversion must use the marked npm package (require('marked')).
- Screenshots are copied from config.screenshots.outputDir to docs/assets/screenshots/.
- mkdocs.yml nav must mirror the tree hierarchy from /api/tree.
- Skipped doc types: source-code, ui-source-code, sql, schema-state, sample-data â€” these are too verbose for documentation.

## Tools Used

- file_manager

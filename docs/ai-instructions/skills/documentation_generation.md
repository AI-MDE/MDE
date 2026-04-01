# documentation_generation

| Field | Value |
|-------|-------|
| `name` | `documentation_generation` |
| `next_phase` | governance |

---

## Purpose

Generate project documentation from configuration, architecture, and generated artifacts. Produces SETUP.md covering environment setup, all API endpoints, all UI routes, all run commands, and troubleshooting.

## Rules

- CRITICAL: SETUP.md must be written to the project ROOT (next to package.json), not to output/docs.
- CRITICAL: The API Endpoints section must list ALL endpoints â€” GET and mutations (POST, PUT, PATCH, DELETE). Never omit write endpoints.
- CRITICAL: The UI Modules section must list every routed page, including nested detail and form pages (e.g. requests/:id/modify), not just top-level menu items.
- CRITICAL: The Running section must clearly state that backend and frontend run in SEPARATE terminals simultaneously.
- CRITICAL: The Troubleshooting section must include: blank page / wrong role (localStorage.clear()), backend changes not taking effect (rebuild or use npm run dev), port already in use, PostgreSQL not running.
- CRITICAL: The mock auth section must note that login defaults to the highest-privilege role (HR_ADMIN) so all modules are visible during development.
- Derive the API endpoint table from module-catalog.json exposes[] arrays â€” one row per exposed operation.
- Derive the UI routes table from ui-catalog.json and ui-{module}.json page specs â€” one row per page.
- Use tables (markdown pipe syntax) for endpoints and UI routes â€” not bullet lists.
- Do not overwrite canonical source files (schema.sql, configuration.json, etc.).
- Do not include placeholder or example content â€” all values must be derived from actual configuration.

## Tools Used

- file_manager

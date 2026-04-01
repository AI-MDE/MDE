# screenshot_generation

| Field | Value |
|-------|-------|
| `name` | `screenshot_generation` |
| `next_phase` | testing |

---

## Purpose

Generate a Playwright-based screenshot script for all app pages defined in the UI module specs. Patches configuration.json with a screenshots section and package.json with the required script entry and devDependency.

## Rules

- CRITICAL: The script must be pure CommonJS (require/module.exports) â€” no import/export syntax, no TypeScript.
- CRITICAL: Use the glob npm package (v10 sync API or glob.sync) to resolve uiModulePattern â€” do not use fs.readdirSync manually.
- CRITICAL: Login once per run using a shared browser context â€” do NOT open a new context per page.
- CRITICAL: screenshots.sampleIds keys must exactly match page.id values from the UI module spec (e.g. '/my-leave/requests/:id'), not router path strings.
- CRITICAL: Patch package.json by reading and merging â€” do NOT overwrite the entire file.
- CRITICAL: Patch configuration.json by reading and merging the screenshots section â€” do NOT overwrite existing keys.
- Generate the script so it is runnable immediately after npm install â€” no compilation required.
- outputDir from configuration.json is relative to project root â€” resolve it with path.resolve(ROOT, outputDir) in the script.
- The script must create outputDir recursively with fs.mkdirSync if it does not exist.
- Print per-page [ok] / [fail] / [skip] lines to stdout for visibility during CI runs.
- Do not hardcode any URLs, credentials, or IDs in the script â€” all values must come from configuration.json or environment variable overrides.

## Tools Used

- file_manager

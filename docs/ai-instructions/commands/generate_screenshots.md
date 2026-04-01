# Generate Screenshot Script

| Field | Value |
|-------|-------|
| `name` | `generate_screenshots` |
| `phase` | testing |
| `intent` | generate |
| `ai` | `required` |

---

## Calls

- screenshot_generation

## Tools

- file_manager
- json_validator

## Rules

- Add screenshots section to configuration.json if absent
- Patch package.json to add test:screenshots script and @playwright/test devDependency
- Generate scripts/takeScreenshots.js â€” must be runnable with node, no build step required
- Derive sampleIds from files in output/sample-data/ â€” read the first id from each JSON array
- Map each parameterized route pattern (containing :id) to the appropriate sample entity ID

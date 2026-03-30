# AI-MDE Dashboard Integration Notes

Included changes:

- `viewer.ts`
  - imports `ai-mde-dashboard.ts`
  - adds `GET /api/dashboard`
- `viewer-client.js`
  - adds `openDashboard()`
  - adds virtual document renderer for `dashboard`
- `viewer.html`
  - adds **Dashboard** menu item
- `ai-mde-dashboard.ts`
  - reads multiple JSON files and builds one dashboard payload

## Optional configuration

Add this to your `configuration.json` if your dashboard source files are not in the defaults.

```json
{
  "dashboard": {
    "project": "path/to/project.json",
    "phases": "path/to/phases.json",
    "tasks": "path/to/tasks.json",
    "artifacts": "path/to/artifacts.json",
    "blockers": "path/to/blockers.json",
    "activity": "path/to/activity.json",
    "decisions": "path/to/decisions.json"
  }
}
```

## Default fallback paths

If `configuration.json` does not contain a `dashboard` section, the viewer will look for:

- `data/dashboard/project.json`
- `data/dashboard/phases.json`
- `data/dashboard/tasks.json`
- `data/dashboard/artifacts.json`
- `data/dashboard/blockers.json`
- `data/dashboard/activity.json`
- `data/dashboard/decisions.json`

## How to open it

Start your existing viewer, then use the top menu and click **Dashboard**.

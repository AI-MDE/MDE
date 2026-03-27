# initiate_project Command

`initiate_project` is the backward-compatible entry point for app bootstrap.

It delegates to:

- `mde/tools/init-app.js`

## Why This File Exists

Older command bindings and workflows refer to `initiate_project`.
This wrapper keeps those flows working while the implementation lives in `init-app.js`.

## Usage

```powershell
node .\mde\tools\initiate_project.js --config=.\configuration.json
```

Dry run (no writes):

```powershell
node .\mde\tools\initiate_project.js --config=.\configuration.json --dry-run
```

Equivalent preferred command:

```powershell
node .\mde\tools\init-app.js --config=.\configuration.json
```

## Behavior

- Loads `configuration.json` via `ConfigurationManager`
- Creates missing workspace directories
- Creates starter files only when they do not already exist
- Never overwrites existing files
- Supports `--dry-run` to preview changes

## Typical Starter Files

- `application/application.json`
- `ba/requirements.md`
- `ba/analysis-status.md`
- `design/application_architecture.json`
- `project/questions.json`
- `project/open-queue.json`
- `project/completed-Questions.json`
- `project/project-state.json`
- `.env`
- `package.json`
- `tsconfig.json`

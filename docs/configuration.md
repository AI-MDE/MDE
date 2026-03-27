# Configuration Specification

## Overview

The host root `configuration.json` is a thin bootstrap config. Model structure lives in:
- `metaModel/appStructure.json` — viewer catalog and patterns (read directly by the viewer)
- `metaModel/doctypes.json` — doctype definitions (loaded via `ConfigurationManager`)

## Root configuration.json

Required metadata:
- `Methodology`
- `Project-Type`
- `Project-Name`
- `Description`
- `MDT-path`
- `Author`
- `Version`

Required model pointer:
- `metaModel.doctypes` (path to `doctypes.json`)

Documentation-only sections (not loaded at runtime):

`meta` — pointers to workspace model sources:
- `methodology` → `mde/methodology/methodology.json` (source of truth for phases and lifecycle)
- `appStructure` → `metaModel/appStructure.json` (viewer catalog, generated from methodology)

`ai` — pointers to AI instruction sources:
- `orchestrator` → `mde/ai-instructions/orchestrator.json`
- `commands` → `mde/ai-instructions/commands/`
- `skills` → `mde/ai-instructions/skills/`

## metaModel/appStructure.json

Viewer-only config — read directly by the viewer, not merged into the config object.

Contains:
- `patterns` — filename regex patterns for doc scanning
- `catalog` — the viewer sidebar tree (phases, groups, docs)

`catalog` is the viewer tree source of truth. Edit this file or regenerate with:
```powershell
node mde/scripts/generateAppStructure.js
```

## metaModel/doctypes.json

Contains doctype definitions:
- `ids`
- `recommendedCommands` (exception-only; empty by default)
- `template`

Rule:
- File paths belong in `catalog`, not in doctypes.

## Viewer Behavior

The viewer reads:
- `catalog` and `patterns` directly from `metaModel/appStructure.json`
- `doctypes` from `doctypes.json` (via `ConfigurationManager`)
- command definitions from `mde/ai-instructions/commands/*.json`

## Validation

```powershell
node .\mde\tools\validate-config.js .\configuration.json
```

```powershell
node .\tests\test-web-viewer.js
```

## Seed Templates

`initiate_project` / `init-app` can seed core JSON files from:
- `mde/templates/seeds/doctypes.json.tpl`
- `mde/templates/seeds/orchestrator.json.tpl`

Templates are also available for creating new AI instruction files:
- `mde/templates/seeds/command.json.tpl`
- `mde/templates/seeds/skill.json.tpl`
- `mde/templates/seeds/tool-command.js.tpl`

Tokens supported in seed templates:
- `{{PROJECT_NAME}}`
- `{{PROJECT_TYPE}}`
- `{{DESCRIPTION}}`
- `{{MDE_PATH}}`

Additional tokens for new command/skill templates:
- `{{COMMAND_NAME}}`
- `{{COMMAND_LABEL}}`
- `{{PHASE}}`
- `{{INTENT}}`
- `{{AI_MODE}}`
- `{{SKILL_NAME}}`
- `{{SKILL_PURPOSE}}`
- `{{NEXT_PHASE}}`

# initiate_project

| Field | Value |
|-------|-------|
| `name` | `initiate_project` |
| `next_phase` | business_analysis |

---

## Purpose

Initialize a new project with default templates and directory structure

## Outputs

- ../../ba/requirements.md
- ../../design/application_architecture.json
- ../../project/project-state.json
- package.json
- tsconfig.json
- .env

## Rules

- Do not overwrite existing files without confirmation
- Ensure standard folder structure is created

## Tools Used

- file_manager
- json_validator

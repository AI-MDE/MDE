# Model-Driven Development Methodology
| Field | Value |
|-------|-------|
| `methodology` | Model-Driven |
| `version` | 1.2 |

---

## Principles

- Dual Artifacts
- Progressive Refinement
- No Phase Skipping
- Traceability
- Separation of Concerns
- Single Source of Truth
- Stable IDs

## Workflow Patterns


### Discovery Loop

A general iterative input/analyse/clarify cycle used whenever a phase requires progressive clarification from raw inputs before an artifact can be produced.

**Steps:**
1. Drop input files into the phase inbox folder
2. Run the relevant command — the AI reads inputs and produces a first-pass artifact and a question batch
3. Review and answer the questions in the question batch file (edit responses in place)
4. Re-run the command — accepted answers are incorporated, completed questions are archived, new questions are generated for remaining gaps
5. Repeat until the artifact is stable and the question queue is empty or all remaining items are explicitly deferred
6. Processed input files are moved from the inbox to the processed folder so future runs focus only on new material

**Folder convention:** Each phase that uses discovery maintains an inbox folder (e.g. ba/discovery/) and a processed folder (e.g. ba/analyzed/). The convention is inbox → processed after the file has been incorporated.

**Question lifecycle:**
- `active`: project/questions.json — current batch, open for user response
- `deferred`: project/open-queue.json — items that cannot be resolved yet
- `completed`: project/completed-Questions.json — items accepted into the artifact baseline

**Applies to phases:** business_analysis, system_design, module_specification

## Module Types

| ID    | Description                                                        |
|-------|--------------------------------------------------------------------|
| `svc` | **Service** — Business logic and orchestration layer               |
| `dal` | **Data Access Layer** — Database interaction and persistence layer |

## Naming Conventions


### Files

| Type              | Template → Location                                   |
|-------------------|-------------------------------------------------------|
| `use_case`        | `uc-{number}-{name}.md` → `ba/use-cases/`             |
| `entity`          | `ent-{name}.json` → `design/entities/`                |
| `module_charter`  | `module-charter-{name}.md` → `design/modules/{type}/` |
| `module_def`      | `module-{name}.json` → `design/modules/{type}/`       |
| `module_spec_dir` | `{module-name}/` → `design/modules/{type}/`           |

### IDs

| Type                  | Template (example)                                   |
|-----------------------|------------------------------------------------------|
| `requirement`         | `BR-{number}` (e.g. `BR-001`)                        |
| `business_rule`       | `BRule-{number}` (e.g. `BRule-001`)                  |
| `constraint`          | `CON-{number}` (e.g. `CON-001`)                      |
| `acceptance_criteria` | `AC-{number}` (e.g. `AC-001`)                        |
| `risk`                | `RISK-{number}` (e.g. `RISK-001`)                    |
| `module`              | `MOD-{number}` (e.g. `MOD-001`)                      |
| `test_suite`          | `TS-{MODULE}-{number}` (e.g. `TS-CLAIM-001`)         |
| `test_case`           | `TC-{MODULE}-{suite}-{case}` (e.g. `TC-CLAIM-01-02`) |

## Governance (Cross-Phase)


Inspection, validation, and assessment commands available at any phase — no prerequisites on phase

- assess_methodology
- assess_architecture
- identify_external_references
- validate_traceability
- show_phase_status
- generate_diagrams
- generate_documentation

## Phases


### Project Initiation

Bootstrap the workspace with default structure, configuration, and state files. Select the methodology and architecture before analysis begins.

**Commands:** `initiate_project`, `select_methodology`, `select_architecture`

**Required docs:** Configuration, Application Definition, Project State

### Business Analysis

Analyze source material, derive a requirements baseline, and generate targeted clarification questions

**Commands:** `identify_domain`, `identify_external_references`, `perform_business_analysis`, `generate_business_functions`, `generate_use_cases`, `validate_requirements`

**Required docs:** Requirements, Analysis Status, Business Functions, Use Cases

### System Design

Derive architecture, logical data model, and module catalog from the requirements baseline

**Commands:** `build_system_design`, `generate_ldm`, `generate_erd`, `validate_architecture`, `validate_ldm_coverage`

**Required docs:** Application Architecture, Module Catalog, Logical Data Model

### Module Definition

Define module charters and detailed module contracts for each module type

**Commands:** `generate_module_catalog`, `generate_module_charter`

**Required docs:** Service Module Charters, DAL Module Charters

### Module Specification

Produce schema, rules, state machine, and API spec for each module

**Commands:** `generate_module_spec`

**Required docs:** Module Specifications

### Tests

Define test plans and acceptance criteria for each module

**Required docs:** Module Tests

### Development

Generate DAL, source code, and sample data from module specifications

**Commands:** `generate_dal`, `generate_dal_from_db`, `generate_source_code`, `generate_sample_data`

**Required docs:** Source Code, Generated Manifest

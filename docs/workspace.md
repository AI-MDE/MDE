# Workspace Directory Structure

> Generated: 2026-03-26

Below is a typical mde workspace structure.

## Entry Points
### For AI engines
- at root
    AGENT.md
     CLAUDE.md
### for mde
- at root
    configuration.json

### for build tools
- at root
    package.json
    

```
workspace/                                      ← project root
├── AGENT.md                                    ← Gemini session bootstrap
├── CLAUDE.md                                   ← Claude session bootstrap
├── configuration.json                          ← project configuration
├── package.json / tsconfig.json                ← Node.js / TypeScript config
├── .env / .gitignore
│
├── application/
│   └── application.json                        ← app definition, subjects, release scope
│
├── ba/                                         ← business analysis
│   ├── requirements.md                         ← requirements baseline
│   ├── analysis-status.md                      ← BA status, source inventory, blockers
│   ├── discovery/                              ← inbox: new source material to be analyzed
│   ├── analyzed/                               ← processed source material
│   │   └── claims_management.md
│   ├── use-cases/                              ← uc-001 … uc-008
│   └── data-model/
│       └── logical-data-model.json
│
├── project/                                    ← active BA working state
│   ├── questions.json                          ← current clarification batch
│   ├── open-queue.json                         ← unresolved issues
│   ├── completed-Questions.json                ← accepted answers archive
│   └── project-state.json                      ← phase, artifacts, next commands
│
├── design/                                     ← system design artifacts
│   ├── application_architecture.json
│   ├── data-model/
│   ├── entities/
│   └── modules/
│       ├── module-catalog.json
│
├── src/                                        ← generated source code
│
├── metaModel/                                  ← meta-model config
│   ├── appStructure.json                       ← viewer catalog and patterns (viewer-only)
│   └── doctypes.json
│
├── output/                                     ← generated output artifacts
│   ├── reports/                                ← validation & phase reports
│   │   ├── architecture-validation-report.json
│   │   ├── ldm-coverage-report.json
│   │   └── phase-status-report.json
│   └── docs/
│       └── diagrams/
├── tests/
└── mde/                                        ← MDE engine (self-contained)
    ├── GEMINI.md                               ← Gemini engine bootstrap
    ├── formal_schemas.md
    │
    ├── ai-instructions/                        ← AI source of truth (JSON, read by AI)
    │   ├── orchestrator.json                   ← command resolution, pipeline, phase rules
    │   ├── commands/                           ← 22 command definitions
    │   │   └── <command_name>.json
    │   └── skills/                             ← 19 skill definitions
    │       └── <skill_name>.json
    │
    ├── docs/                                   ← documentation
    │   ├── workspace.md                        ← this file
    │   ├── ai-instructions/                    ← generated from ai-instructions/ by syncAIInstrToDocs.js
    │   │   ├── index.md                        ← overview & AI adherence explainer
    │   │   ├── orchestrator.md                 ← generated orchestrator reference
    │   │   ├── commands/                       ← 22 generated .md files
    │   │   └── skills/                         ← 19 generated .md files
    │   └── *.md / *.svg                        ← proposals, notes, guides, diagrams
    │
    ├── scripts/
    │   ├── syncAIInstrToDocs.js                ← generates mde/docs/ai-instructions/
    │
    ├── tools/                                  ← Node.js command executors
    │   ├── mde-cli.js                          ← CLI entry point
    │   ├── run-skill-api.js                    ← AI skill runner
    │   ├── build-skill-debug-bundle.js         ← packages debug inputs
    ├── debugAI/                                ← per-skill debug bundles (runtime output)
    │   └── <skill_name>/
    │       ├── ai-prompt.txt
    │       ├── manifest.json
    │       ├── inputs/
    │       └── inputs.zip
    │
    ├── architecture/                           ← architecture rule definitions
    │   ├── architecture.json
    │   ├── audit-rules.json
    │   ├── layer-rules.json
    │   └── *.json / *.md
    │
    ├── schemas/                                ← JSON schemas for validation
    │   ├── requirements.schema.json
    │   ├── trace-matrix.schema.json
    │   └── module-tests.schema.json
    │
    ├── templates/                              ← output templates & seed files
    │   ├── seeds/                              ← .tpl scaffolds for new commands/skills
    │   │   ├── command.json.tpl
    │   │   ├── skill.json.tpl
    │   │   └── *.tpl
    │   └── *.md                                ← document structure templates
    │
    ├── methodology/
    │   └── methodology.json
    │
    ├── app-template/                           ← starter template for new projects
    │   ├── AGENT.md
    │   └── configuration.json
    │
    └── web/                                    ← local web viewer UI
        ├── viewer.html / viewer.js
        ├── app.js
        └── style.css
```

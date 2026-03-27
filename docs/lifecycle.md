# MDE Workflow Lifecycle
> Generated from `mde/ai-instructions/orchestrator.json`
```mermaid
flowchart TD

    subgraph GOV["⟳ governance  —  available at every phase"]
        GOV_CMD["assess_methodology  ·  assess_architecture  ·  identify_external_references  ·  validate_traceability  ·  show_phase_status  ·  generate_diagrams  ·  generate_documentation"]
    end

    subgraph P0["① project_initiation"]
        P0_CMD["initiate_project
select_methodology
select_architecture"]
    end

    subgraph P1["② business_analysis"]
        P1_CMD["identify_domain
identify_external_references
perform_business_analysis
generate_business_functions
generate_use_cases
validate_requirements"]
    end

    subgraph P2["③ system_design"]
        P2_CMD["build_system_design
generate_ldm
validate_ldm_coverage
generate_modules
validate_architecture"]
    end

    subgraph P3["④ development"]
        P3_CMD["generate_source_code
generate_sample_data"]
    end

    GOV -.-> P0 & P1 & P2 & P3

    P0 -->|"project/project-state.json exists or initialization was intentionally skipped"| P1
    P1 -->|"ba/requirements.md exists"| P2
    P2 -->|"design/application_architecture.json exists"| P3

    style GOV fill:#f1f5f9,stroke:#94a3b8,color:#334155
    style P0  fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style P1  fill:#dcfce7,stroke:#22c55e,color:#14532d
    style P2  fill:#fef9c3,stroke:#eab308,color:#713f12
    style P3  fill:#ffedd5,stroke:#f97316,color:#7c2d12
```

---

## Command Availability by Phase

| Command | ① project initiation | ② business analysis | ③ system design | ④ development | ⟳ always |
|---------|----------------------|---------------------|-----------------|---------------|----------|
| `initiate_project` | ✓ |  |  |  |  |
| `select_methodology` | ✓ |  |  |  |  |
| `select_architecture` | ✓ |  |  |  |  |
| `identify_domain` |  | ✓ |  |  |  |
| `identify_external_references` |  | ✓ |  |  | ✓ |
| `perform_business_analysis` |  | ✓ |  |  |  |
| `generate_business_functions` |  | ✓ |  |  |  |
| `generate_use_cases` |  | ✓ |  |  |  |
| `validate_requirements` |  | ✓ |  |  |  |
| `build_system_design` |  |  | ✓ |  |  |
| `generate_ldm` |  |  | ✓ |  |  |
| `validate_ldm_coverage` |  |  | ✓ |  |  |
| `generate_modules` |  |  | ✓ |  |  |
| `validate_architecture` |  |  | ✓ |  |  |
| `generate_source_code` |  |  |  | ✓ |  |
| `generate_sample_data` |  |  |  | ✓ |  |
| `assess_methodology` |  |  |  |  | ✓ |
| `assess_architecture` |  |  |  |  | ✓ |
| `validate_traceability` |  |  |  |  | ✓ |
| `show_phase_status` |  |  |  |  | ✓ |
| `generate_diagrams` |  |  |  |  | ✓ |
| `generate_documentation` |  |  |  |  | ✓ |

---

## Phase Summary

| # | Phase | Entry Condition | Exit Condition |
|---|-------|----------------|----------------|
| ① | `project_initiation` | — | ../../project/project-state.json exists or initialization was intentionally skipped |
| ② | `business_analysis` | — | ../../ba/requirements.md exists, ../../ba/analysis-status.md exists, ../../project/questions.json exists, ../../project/open-queue.json exists |
| ③ | `system_design` | ../../ba/requirements.md exists | ../../design/application_architecture.json exists, ../../design/modules/module-catalog.json exists, at least one module definition exists in design/modules/ |
| ④ | `development` | schema.json exists for target module | development artifacts exist for the target command |
| ⟳ | `governance` | — | — |

> Solid arrows = phase progression. Dashed arrows = governance commands available at every phase.

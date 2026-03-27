# AI-MDE Product View — Revised

## 1. Product Definition

**AI-MDE** is a model-driven, AI-orchestrated engineering approach for turning mixed project materials into a structured, traceable analysis baseline and then deriving downstream design artifacts in a disciplined progression.

It is designed for the real condition of most projects:
- incomplete requirements
- mixed artifacts
- business and technical content blended together
- unclear scope
- unclear lifecycle expectations
- evolving understanding over time

AI-MDE should not assume the user starts with a clean requirements package.

Instead, AI-MDE should guide the user from discovery through analysis, modeling, architecture, and design.

---

## 2. Core Progression

AI-MDE should follow this progression:

**Raw Inputs -> Discovery -> Business Analysis Baseline -> Business Capabilities -> Use Cases -> Data Model -> Architecture -> System Design**

This can be adapted to predictive, agile, or hybrid delivery models, but the core principle remains:

**do not jump to architecture before the business understanding is strong enough**

---

## 3. Major Expertise Areas

AI-MDE should provide five major expertise areas.

### A. Delivery Methodology
Determine and validate the project/system lifecycle approach:
- predictive
- iterative / incremental
- sprint-based agile
- hybrid

This skill tailors:
- artifact rigor
- approval style
- stage gates
- change handling
- degree of up-front definition vs incremental elaboration

### B. Business Analysis
Drive discovery and requirement development:
- identify business domain
- identify business capabilities
- derive use cases
- extract rules, entities, artifacts, and constraints
- ask targeted clarification questions
- maintain audit trail and queue
- filter hybrid documentation

### C. Data Modeling
Derive or validate the conceptual/logical data model:
- infer entities, attributes, relationships
- review an existing model
- compare BA nouns/concepts to the model
- produce completeness and coverage analysis
- identify open semantic questions

### D. System Architecture
Derive the logical architecture from the validated BA baseline and data model:
- module decomposition
- boundaries
- integrations
- architectural drivers
- high-level interactions
- tradeoffs and open issues

### E. System Design
Refine architecture into design artifacts:
- detailed workflows
- APIs
- data persistence shape
- module specifications
- interface contracts
- implementation-oriented structure

---

## 4. Product Principles

AI-MDE should be guided by these principles:

- evidence before opinion
- business analysis before architecture
- AI leads discovery
- user validates and clarifies
- methodology matters
- keep uncertainty visible
- preserve full audit trail
- treat unresolved items as queue, not hidden assumptions
- support hybrid documentation
- derive later artifacts from validated earlier artifacts

---

## 5. Delivery Methodology as a First-Class Skill

AI-MDE should identify and confirm the lifecycle methodology early.

Supported modes:
- Predictive
- Iterative / Incremental
- Sprint-based Agile
- Hybrid

The chosen methodology should influence:
- required artifacts
- degree of up-front completeness
- approval expectations
- change management
- cadence of refinement
- architecture timing
- design timing

AI-MDE should not simply accept the user’s label at face value.
It should validate whether the project’s actual constraints match the claimed methodology.

---

## 6. Business Domain and Domain Reference Policy

The **business domain** is a required property of the analysis baseline.

AI-MDE should:
- identify the likely domain early
- confirm it with the user
- record it explicitly
- ask whether domain references may be consulted

Allowed modes:
- project artifacts only
- project artifacts plus domain guidance
- domain guidance as suggestions only

Project artifacts and stakeholder answers remain the primary truth source.

---

## 7. Business Capabilities

AI-MDE should identify the major **business capabilities** of the target application.

These are the major business-level things the application will enable users to do.

Examples:
- Claim Intake
- Claim Review
- Claim Decisioning
- Payout Management
- Status Tracking
- Document Management
- Notification Management
- Reporting and Oversight

Business capabilities should be used as the bridge between:
- business problem and scope
- use cases
- requirements
- later architecture and design

They should be treated as a standard BA artifact in non-trivial efforts.

---

## 8. Discovery in the Real World: Hybrid Documentation

AI-MDE must assume users provide hybrid source material.

Source artifacts may mix:
- business notes
- requirements
- design concepts
- workflows
- diagrams
- data models
- table structures
- sample data
- API payloads
- reports
- screenshots

AI-MDE should:
- extract business meaning from all of them where possible
- classify what belongs to BA vs later phases
- preserve design and technical artifacts for later reuse
- avoid promoting design assumptions into confirmed business truth
- use sample data and structures later for data modeling and architecture

---

## 9. Business Analysis Operating Model

The BA stage should produce:
- source inventory
- discovery findings
- terminology map
- clarification log
- assumptions register
- conflict register
- requirements baseline
- business rules catalog
- entity/artifact catalog
- business capabilities
- use cases
- BA document
- open issues queue
- design readiness summary
- traceability matrix
- change log

The BA stage should actively ask the next best questions rather than waiting for a perfect requirements document.

Questions should include:
- why they matter
- current understanding
- likely answer candidates where appropriate
- defer-to-queue option

---

## 10. Data Modeling as the Next Major Phase

Once BA is sufficiently stable, AI-MDE should derive or validate the data model.

This phase should:
- derive conceptual and logical data structures
- validate completeness against the BA baseline
- classify business nouns into entity, attribute, role, status, synonym, derived concept, reference data, or unresolved concept
- identify missing and overlapping concepts
- compare the model against use cases, rules, reports, and sample data

A data modeling expert skill should review coverage and completeness, not just produce a diagram.

---

## 11. Architecture and Design Derivation

Architecture should not be invented directly from raw source material.

It should be derived from:
- validated BA outputs
- business capabilities
- use cases
- data model
- methodology constraints
- open issues and assumptions

Detailed system design should then refine the architecture into implementable artifacts.

This preserves traceability and keeps technical structure grounded in validated business understanding.

---

## 12. Commands and Skills Model

AI-MDE should use a command-and-skill model.

### Command
Represents what the user wants to do:
- perform business analysis
- derive data model
- build architecture
- build system design
- validate requirements
- review completeness

### Skill
Represents how AI should do it:
- method
- required input types
- optional inputs
- outputs
- completion rules
- constraints

Multiple skills should be stored as separate files for clarity and maintainability.

Commands select skills.
Skills provide execution behavior.
Runtime context resolves actual files and current project state.

---

## 13. Runtime and Tooling Strategy

Different AI surfaces behave differently.

### Claude-style workflow
Strong candidate for local command execution because custom slash commands and shell expansion provide a meaningful runtime bridge between static command/skill definitions and live project context.

### Gemini-style workflow
Usable, but more prompt-driven and less strict about custom schemas as hard contracts. Stronger translation from internal command/skill model to Gemini-friendly prompts is needed.

### Codex-style workflow
Excellent as a developer assistant and local coding agent, but plan-based usage limits and console behavior make it less suitable as the sole runtime foundation for AI-MDE orchestration.

The product should remain model-driven and not depend on one IDE tool’s quirks.

---

## 14. Trust Model

AI-MDE should reduce trust burden through structure.

It should rely on:
- explicit commands
- visible skill definitions
- bounded actions
- audit trail
- queue and change tracking
- visible methodology
- controlled write permissions

Where AI is involved, the user should trust the **command contract and skill behavior**, not a hidden free-form prompt.

---

## 15. Reference Help Site Direction

AI-MDE should maintain or point to a strong VA/assistant help layer built from existing respected sources.

Core references:
- IIBA BABOK / Business Analysis Standard / Glossary / KnowledgeHub
- APQC PCF
- OMG BPMN
- OMG DMN

The help layer should support:
- BA method
- delivery methodology guidance
- domain identification
- business capability guidance
- process and rules references
- data modeling guidance
- architecture/design transitions
- domain-specific packs over time

---

## 16. Current Product Shape

AI-MDE today should be described as:

> A model-driven, AI-guided engineering framework that helps teams move from mixed project materials to validated business analysis, complete and reviewed data models, derived architecture, and structured system design, while preserving methodology alignment, audit trail, and traceability throughout.

That is the current best view of the product.

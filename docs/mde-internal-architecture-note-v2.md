# MDE Internal Architecture Note

## 1. Purpose

This note defines the internal architecture of **MDE** as a model-driven, document-centric lifecycle engine.

The core idea is that MDE is not merely a collection of prompts, commands, or files.  
At its center is a **meta-model repository** that defines the lifecycle, artifacts, behavior, and validation rules of the platform.

MDE should manage the lifecycle of application and system development through:
- lifecycle definitions
- phase definitions
- document types
- schemas
- templates
- commands
- skills
- validations
- generation rules
- traceability
- readiness gates

This makes MDE a governed engineering environment rather than a loose AI assistant.

---

## 2. Core Architectural Principle

The platform should be understood through this chain:

**Lifecycle -> Phase -> Document Type -> Schema -> Template -> Validation -> Command -> Skill -> Output**

This is the internal backbone of MDE.

For every lifecycle, MDE should know:
- what phases exist
- what documents are expected in each phase
- which documents are required or optional
- how each document enters the system
- which commands operate on it
- which skill governs that operation
- how it is validated
- how it is presented to the user
- when the phase is considered ready to advance

---

## 3. The Center of the Product: Meta-Model Repository

The center of MDE should be called the **Meta-Model Repository**.

This repository is the governing model of the platform. It defines the structure of project lifecycles and the artifacts managed on behalf of the user.

The meta-model repository should contain:

- lifecycle definitions
- phase definitions
- document type definitions
- document schemas
- document presentation templates
- command definitions
- skill definitions
- validation rules
- generation rules
- readiness gates
- dependency relationships
- traceability rules

This is more accurate than calling it a catalog, because it is not only a list. It is the formal model that defines what the platform knows and how it behaves.

---

## 4. Static Meta-Model vs Runtime Project State

A critical architectural distinction is the separation of:

### A. Static Meta-Model
Defines the platform itself:
- supported lifecycles
- phases
- document types
- schemas
- templates
- commands
- skills
- validations
- generation rules

### B. Runtime Project State
Defines one active project instance:
- actual artifacts/documents
- actual lifecycle and current phase
- actual user-provided materials
- actual AI-generated outputs
- actual validation results
- actual open issues and queues
- actual trace links
- actual change history

The meta-model governs the runtime state, but the two should remain separate.

---

## 4.1 Methodology and Architecture Influence on the Meta-Model

The MDE Meta-Model Repository is not purely static. Its effective behavior is influenced by project-specific context.

Two major influences are:

### Delivery Methodology
The selected or derived delivery methodology influences:
- active lifecycle and phase behavior
- required versus optional artifacts
- validation rigor
- approval expectations
- readiness gates
- change management style
- iteration and refinement rules

### Architecture Direction
The selected or derived architectural direction influences:
- which design artifacts are expected
- which document types become relevant in later phases
- the depth and structure of data modeling
- integration and interface expectations
- module and component modeling
- cross-document validation rules
- traceability requirements from requirements to design

The effective project meta-model should therefore be understood as:

**Static Meta-Model + Methodology Context + Architecture Context = Active Project Meta-Model**

---

## 5. Main Meta-Model Repositories

## 5.1 Lifecycle Repository

The Lifecycle Repository defines supported project and system development lifecycles.

Examples:
- predictive
- iterative / incremental
- sprint-based agile
- hybrid

For each lifecycle, MDE should define:
- lifecycle identifier
- description
- ordered phases
- mandatory artifacts by phase
- optional artifacts by phase
- validation rigor
- approval expectations
- change management style
- readiness gate behavior

This repository lets MDE adapt the process to the chosen methodology.

---

## 5.2 Phase Repository

The Phase Repository defines the phases within each lifecycle.

Examples:
- discovery
- business analysis
- data modeling
- architecture
- system design
- implementation planning

For each phase:
- phase identifier
- display label
- lifecycle membership
- purpose
- entry criteria
- exit criteria
- required documents
- recommended documents
- commands available in this phase
- skills commonly used in this phase
- validation checks
- readiness gate

This repository provides the structure for guided progression.

---

## 5.3 Document Type Repository

The Document Type Repository defines every artifact MDE can manage.

Examples:
- source inventory
- discovery findings
- requirements baseline
- business capabilities
- use cases
- business rules catalog
- open issues queue
- conceptual data model
- logical data model
- architecture baseline
- system design
- traceability matrix
- change log

For each document type:
- id
- display name
- purpose
- lifecycle phases where used
- status in phase: required / recommended / optional
- source mode
- schema reference
- template reference
- validation rules
- generation rules
- dependencies
- related commands
- related skills

This repository is one of the most important parts of the system.

---

## 5.4 Schema Repository

Every document type should have a schema.

The schema provides:
- machine-readable structure
- required fields
- section rules
- data typing
- consistency rules
- interoperability between commands and skills

Possible forms:
- JSON schema
- typed structured model
- structured markdown schema

The schema is what allows MDE to validate that a document is complete enough for the next step.

---

## 5.5 Template Repository

The Template Repository defines how each document type is presented to the user.

Templates should support:
- markdown views
- HTML-style rendering
- user-friendly layout
- sectioned displays
- non-technical presentation

This is separate from the schema.

- **Schema** = machine form
- **Template** = human form

This separation is important because the internal document may be structured, while the user sees a readable artifact.

---

## 5.6 Command Repository

The Command Repository defines the actions users can invoke.

Commands should be categorized by:
- lifecycle
- phase
- intent
- write scope
- required maturity
- target artifacts
- linked skill

Examples:
- perform business analysis
- generate clarification batch
- validate BA completeness
- derive data model
- validate noun coverage
- derive architecture
- build system design

Commands should be visible to the user based on:
- selected lifecycle
- current phase
- readiness state
- available artifacts
- blocked/unblocked status

Commands are the user-facing action layer.

---

## 5.7 Skill Repository

The Skill Repository defines how AI performs each major kind of work.

Examples:
- delivery methodology advisor
- business analysis from sources
- data model from BA
- system architecture from BA and data
- system design from architecture

Each skill should define:
- id
- purpose
- methodology
- required input types
- optional input types
- expected output types
- completion criteria
- behavior on uncertainty
- validation expectations
- constraints and guardrails

Commands choose skills.  
Skills define behavior.

---

## 5.8 Validation Repository

Validation is a first-class component.

Validation rules should operate at multiple levels.

### Document-level validation
- schema completeness
- required fields
- section presence
- field format

### Cross-document validation
- use case references missing capability
- rule references missing requirement
- architecture refers to missing business driver
- data model refers to missing entity or concept

### Lifecycle validation
- phase missing mandatory artifacts
- readiness gate not satisfied
- blocking open issues remain

### Semantic validation
- important business nouns missing from data model
- conflicting requirements remain unresolved
- design moves ahead of insufficient BA

Validation is a major source of product value.

---

## 5.9 Generation Rule Repository

Generation rules define how a document may be created or refreshed.

For each document type, MDE should know:
- whether it can be provided by the user
- whether AI can generate it
- whether it is derived from prior artifacts
- whether it can be regenerated
- what inputs are required
- what skill is responsible
- what validations run after generation

Generation rules connect document types to commands and skills.

---

## 5.10 Traceability Repository

Traceability should be explicit and queryable.

MDE should track links such as:

**Source artifact -> Discovery finding -> Clarification question -> Answer -> Requirement -> Capability -> Use Case -> Data Model -> Architecture -> Design**

Each major artifact should be traceable to earlier evidence and later outputs.

This repository should support:
- trace links
- lineage graphs
- impact analysis
- change propagation
- coverage reporting

---

## 5.11 Readiness Gate Repository

Each phase should have an associated readiness gate.

A readiness gate determines whether the project is allowed to move forward.

Examples:
- BA cannot exit while business domain is unknown
- data model cannot be accepted while critical nouns remain unmapped
- architecture cannot proceed while critical BA blockers remain open
- system design cannot begin without an architecture baseline

Readiness gates should be lifecycle-aware and configurable.

---

## 6. Source Mode / Provenance

Every document type should define how it enters the system.

Suggested source modes:
- provided_by_user
- generated_by_ai
- derived_from_other_documents
- hybrid_user_plus_ai
- imported_from_external_tool

This supports provenance tracking and helps users understand what was:
- authored by them
- inferred by AI
- derived from prior artifacts
- imported from outside

This should also support trust and auditability.

---

## 7. Runtime Artifact Instances

At runtime, each project will contain artifact instances, not just document types.

An artifact instance should include:
- artifact id
- document type id
- project id
- lifecycle and phase
- current status
- source mode
- version
- path or storage reference
- schema validation state
- last updated time
- originating command
- originating skill
- trace links
- approval state if applicable

The runtime artifact model is what the system actually manages during project execution.

---

## 8. Internal Runtime Layers

The internal product architecture should be organized into four layers.

## 8.1 Meta-Model Layer
Defines the static platform model:
- lifecycles
- phases
- doc types
- schemas
- templates
- commands
- skills
- validations
- generation rules
- readiness gates

## 8.2 Project State Layer
Stores runtime project artifacts and state:
- active lifecycle
- active phase
- actual documents
- question queues
- validation results
- trace links
- change history
- approvals
- readiness state

## 8.3 Execution Layer
Runs the actual behavior:
- command interpreter
- skill dispatcher
- generation engine
- validation engine
- traceability engine
- queue manager
- change manager

## 8.4 Presentation Layer
Presents all of this to the user:
- web viewer
- document views
- lifecycle/phase navigation
- validation results
- command selection
- skill visibility
- queue management
- traceability exploration

---

## 9. Commands by Lifecycle and Phase

Commands should not be a flat list.

The UI should surface commands according to:
- selected lifecycle
- current phase
- artifact readiness
- blocked status
- recommended next actions

Examples:

### Business Analysis phase
- analyze source materials
- confirm business domain
- derive business capabilities
- derive use cases
- generate clarification batch
- update BA baseline
- validate BA completeness

### Data Modeling phase
- derive conceptual data model
- review existing model
- validate noun coverage
- generate logical data model

### Architecture phase
- derive architecture baseline
- map capabilities to modules
- validate architecture readiness

This makes the product easier and safer to use.

---

## 10. Viewer / Explorer

A web-based viewer is an important internal tool.

It should expose the product “under the hood.”

Suggested views:
- lifecycle view
- phase view
- document library view
- document detail view
- schema view
- template preview
- command explorer
- skill explorer
- validation results
- traceability graph
- change history

This serves both operational and transparency purposes.

---

## 11. Validation Tools

Validation tools should guide users through both input and output quality.

Validation tools should answer questions like:
- Is the document structurally valid?
- Are required fields present?
- Are the right artifacts available for this phase?
- Are outputs consistent with prior artifacts?
- Are unresolved blockers visible?
- Is the data model complete enough relative to BA?
- Is the architecture grounded in validated BA and data model?

Validation should not be just syntax checking. It should include lifecycle and semantic checks.

---

## 12. Suggested Core Meta-Model Objects

Recommended core internal objects:

- `LifecycleModel`
- `PhaseModel`
- `DocumentType`
- `DocumentSchema`
- `DocumentTemplate`
- `CommandDefinition`
- `SkillDefinition`
- `ValidationRule`
- `GenerationRule`
- `ReadinessGate`
- `ArtifactInstance`
- `TraceLink`
- `ProjectState`

These objects provide the language of the system.

---

## 13. High-Level Example

A simplified example for a project could look like this:

### Lifecycle
Hybrid

### Current phase
Business Analysis

### Required document types in this phase
- source inventory
- requirements baseline
- business capabilities
- use cases
- business rules
- BA document
- open issues queue

### Available commands
- analyze source materials
- derive business capabilities
- generate clarification batch
- validate BA completeness

### Skill used by command
- `business_analysis_from_sources`

### Outputs generated
- requirements baseline
- clarification queue
- BA document draft

### Validation
- business domain present
- business capabilities defined
- use cases present or explicitly deferred
- critical blockers visible

This demonstrates how the meta-model drives execution.

---

## 14. Three Additional Concepts to Keep Explicit

Three concepts should be added explicitly to the meta-model:

### A. Dependency Graph
Which document types depend on which others.

### B. Source Provenance
Was the artifact provided, generated, derived, or imported.

### C. Readiness Gates
What must be true before the phase may advance.

These concepts will become essential as the platform grows.

---

## 15. Repository Operations, Collaboration, and Security

Because MDE is document-centric and manages active lifecycle artifacts, it must support enterprise-grade repository operations.

Core capabilities should include:
- full Git-based source control
- version history and change traceability
- branching and merge practices as appropriate
- collaborative editing and review
- multi-user access
- role-based security
- auditability across artifacts and phases

A guiding principle should be:

> All governed project artifacts in MDE are versioned assets and must participate in source control, audit trail, and collaborative review.

MDE should be source-control-aware, collaboration-aware, and security-aware at the platform level.

---

## 16. Annotation, Review, and Approval

Managed artifacts should support structured review workflows.

MDE should allow:
- annotations and comments
- review threads
- section-level or object-level review
- approval and rejection states
- requested changes
- sign-off history

Review and approval should be supported for:
- business analysis outputs
- data models
- architecture baselines
- system design artifacts
- change requests
- validation results where formal review is required

This enables governed collaboration instead of uncontrolled document exchange.

---

## 17. Product Change Control

MDE must distinguish between:
- changes to managed artifacts/documents
- formal changes to the target product or system itself

The second type requires explicit **product change control**.

A formal Change Request capability should support:
- id
- title
- description
- rationale
- requester
- impacted areas
- impacted artifacts
- priority
- status
- approval state
- impact analysis
- resulting updates and traceability

Product change control should support methodology-specific behavior:
- stronger formality in predictive settings
- lighter but still traceable control in agile/hybrid settings
- propagation of approved changes into affected artifacts, validations, and readiness gates

This should be treated as a major governed feature of the platform.

---

## 18. External Tool Integration

MDE should not be designed as an isolated system.

It should be designed with integration points for:
- source control platforms
- issue and project management tools
- collaborative documentation systems
- diagramming/modeling tools
- identity and access systems
- enterprise collaboration platforms

The exact integration targets may evolve, but the internal architecture should anticipate:
- import/export of artifacts
- synchronization of status and identifiers
- linking to external issues or work items
- preserving traceability across system boundaries

Integration is a subject of further investigation, but should be represented as an architectural concern from the start.

---

## 19. Suggested Additional Core Objects

In addition to the previously identified core objects, the meta-model should anticipate:

- `ReviewThread`
- `Annotation`
- `ApprovalRecord`
- `ChangeRequest`
- `AccessPolicy`
- `IntegrationEndpoint`

These objects support collaboration, governance, and integration around the document-centric lifecycle.

---

## 20. Recommended Naming

The internal center of MDE should be described as:

**The MDE Meta-Model Repository**

Containing:
- lifecycle definitions
- phase definitions
- document type definitions
- schemas
- presentation templates
- commands
- skills
- validation rules
- generation rules
- readiness gates
- traceability rules

This is the most accurate name for the central architectural concept.

---

## 21. Final View

MDE should be understood as a **document-centric lifecycle engine** governed by a meta-model.

It manages:
- what the user may provide
- what AI may generate
- what is required by each lifecycle phase
- how artifacts are validated
- how outputs are presented
- how commands and skills operate
- how traceability and readiness are preserved

That makes MDE a governed engineering platform rather than a simple AI assistant.

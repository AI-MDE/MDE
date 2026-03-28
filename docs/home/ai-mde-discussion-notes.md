# AI-MDE Discussion Notes

## 1. Core Product Direction

AI-MDE should not begin by asking the user for a formal requirements document or for a framework artifact such as Zachman output.

The stronger approach is:

**raw inputs -> guided discovery -> business analysis baseline -> data model -> architecture -> system design**

The system should lead the process, not force the user to know what to provide up front.

The user may provide:
- notes
- source documents
- spreadsheets
- screenshots
- forms
- reports
- sample outputs
- emails
- process descriptions
- diagrams
- sample data
- table structures
- design fragments

AI-MDE should:
- analyze what is already known
- detect missing information
- ask focused questions
- propose likely answers where appropriate
- keep unresolved items in queue
- update structured artifacts incrementally

---

## 2. Business Analysis Stage

The BA stage is the foundation of the product.

Its purpose is to:
- absorb messy source inputs
- extract structured business knowledge
- distinguish explicit facts from inference and assumptions
- identify contradictions and gaps
- ask the next highest-value questions
- build a traceable BA baseline suitable for later design

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
- business analysis document
- design readiness summary
- traceability matrix
- change log

The BA stage should not be treated as a summary exercise. It should behave like a disciplined business analyst.

---

## 3. Audit Trail

A full audit trail is required.

The system should record:
- what source artifacts were used
- what findings were extracted
- what questions were asked
- why each question was asked
- how the user answered
- what changed because of the answer
- what remains unresolved
- what is explicit, inferred, assumed, or conflicting

Trace chain:

**Source artifact -> Discovery finding -> Clarification question -> User answer -> Requirement update -> BA section -> Design driver**

The audit trail should be structured, not just a raw transcript.

---

## 4. AI-Led Discovery

AI-MDE should take the lead.

The user should not need to orchestrate the workflow manually.

The AI should:
- analyze source material
- build a provisional baseline
- identify missing information
- ask the next best questions
- update the baseline after each answer
- maintain queue and traceability
- decide when the BA baseline is mature enough for the next phase

The user’s role is to:
- provide source material
- answer clarification questions
- correct misunderstandings
- review outputs
- approve progression

---

## 5. Trust and Standards Positioning

AI-MDE should not claim to be a human BA expert.

Its credibility comes from:
- standards-aligned method
- evidence-based extraction from project artifacts
- explicit clarification and audit trail
- clear separation of fact, inference, assumption, and unresolved issues

Core reference basis discussed:
- IIBA BABOK / Business Analysis Standard / Glossary
- PMI business analysis guidance
- ISO/IEC/IEEE requirements engineering guidance
- APQC PCF for process and operational reference
- OMG BPMN and DMN for process and decision modeling

The positioning should be:

AI-MDE is a standards-aligned business analysis and design assistant that works from project evidence, asks targeted clarification questions, and produces traceable outputs for human review.

---

## 6. Q/A Handling

Q/A should not rely only on free-form chat.

The preferred practical model is:
- AI generates a structured clarification batch
- user answers in a controlled format
- unanswered items remain in queue
- AI re-evaluates and updates the baseline

Supported answer modes:
- pick from likely answers
- edit a likely answer
- provide free-text answer
- defer to queue / work backlog

Each question should include:
- why it is relevant
- current understanding
- likely answer candidates when possible
- a user response section
- queue/defer option

This can later be rendered by the UI.

---

## 7. JSON-Driven Clarification UI

A strong pattern is:
- AI generates question-batch JSON
- UI renders questions
- user selects/edits/defer answers
- unresolved items remain in queue
- updated JSON is returned to AI
- AI updates BA artifacts and logs

This is cleaner than raw markdown once productized.

---

## 8. Role of MDE

MDE is not just branding.

MDE should be the orchestrator and state manager.

AI handles:
- extraction
- interpretation
- gap detection
- question generation
- rewriting and output generation

MDE handles:
- lifecycle control
- methodology
- file/folder conventions
- change detection
- state tracking
- traceability
- orchestration
- targeted re-evaluation
- readiness gating

MDE should know:
- stage states
- command states
- artifact states
- unresolved issues
- change handling rules

---

## 9. Change Management and Git

AI-MDE should support both:
- formal change control
- iterative refinement

Git should be treated as the baseline version and audit mechanism for project artifacts.

Tracked artifacts may include:
- BA baseline
- requirements
- business rules
- capabilities
- use cases
- clarification queue
- data model
- architecture outputs
- change log
- traceability matrix

---

## 10. Delivery Methodology Skill

Delivery methodology should be treated as a first-class expertise area.

AI-MDE should help the user choose and validate the lifecycle approach:
- predictive
- iterative / incremental
- sprint-based agile
- hybrid

The methodology skill should:
- explain lifecycle options
- assess fit for the initiative
- walk the user through tradeoffs
- validate the chosen mode against project reality
- tailor artifact rigor, approvals, stage gates, and change handling accordingly

Methodology should influence:
- BA rigor
- approval formality
- change control
- data modeling depth
- architecture progression
- design progression
- iteration cadence

---

## 11. Business Domain

Business domain is a required property.

AI-MDE should identify and confirm the business domain early.

Examples:
- insurance claims
- healthcare scheduling
- procurement
- HR onboarding
- loan processing

AI-MDE should also ask whether domain references may be consulted:
- project artifacts only
- project artifacts plus domain guidance
- domain guidance only as suggestions

Project evidence remains the primary source of truth.

---

## 12. Business Capabilities

The term closest to the standard discussion is **business capabilities**, though the plain-language idea is “major business functions the application supports.”

These are not departments or responsibilities.
They are the major business-level things the target application enables users to do.

Examples for a claims system:
- Claim Intake
- Claim Review
- Claim Decisioning
- Payout Management
- Status Tracking
- Document Management
- Notification Management
- Reporting and Oversight

Business capabilities should be treated as a prelude to use cases.

Progression:

**Business Domain -> Business Capabilities -> Use Cases -> Requirements -> Design**

---

## 13. Hybrid Documentation Handling

Discovery must assume the user may provide hybrid documentation.

Source material may mix:
- business analysis notes
- requirements
- design fragments
- diagrams
- data models
- table structures
- technical details
- sample data
- screenshots
- APIs
- report layouts

AI-MDE should:
- extract business meaning wherever possible
- classify source fragments by evidence type
- avoid treating design as automatically approved business truth
- preserve technical/design artifacts for later phases
- note data samples and schemas for data modeling later

Suggested evidence categories:
- business requirement evidence
- business rule evidence
- process/workflow evidence
- capability/use case evidence
- data/entity evidence
- architecture/design evidence
- technical implementation evidence
- sample/reference data
- ambiguous/mixed

---

## 14. Data Modeling Phase

After BA is sufficiently stable, AI-MDE should derive a data model if the user did not already provide one.

Progression:
- conceptual data model
- logical data model
- physical model later if needed

Inputs may include:
- BA document
- business capabilities
- use cases
- business rules
- entities/artifacts catalog
- hybrid technical artifacts
- sample data
- table structures
- schemas
- existing data model

If a data model already exists, AI-MDE should review and validate it rather than blindly regenerate it.

---

## 15. Data Modeling Expert Skill

A dedicated data modeling skill is needed.

Its roles:
- derive a conceptual/logical model when missing
- review an existing model
- validate completeness against the BA baseline
- compare nouns/concepts in BA to the model
- identify missing entities, attributes, relationships, roles, synonyms, statuses, and unresolved concepts

Important rule:
Do not force every noun into an entity.

Classify significant nouns as:
- entity
- attribute
- relationship concept
- role / actor
- status / state
- business rule term
- synonym / alias
- derived concept
- reference data
- out of scope
- unresolved

Outputs may include:
- conceptual data model
- logical data model draft
- noun classification matrix
- coverage report
- missing concept report
- open questions

---

## 16. Architecture and System Design Skills

After BA and data modeling, a major architecture skill is needed.

Architecture skill should:
- derive logical architecture
- identify modules/components
- define boundaries and integrations
- map business capabilities and use cases to architectural structure
- preserve traceability back to BA and data model

After architecture, a system design skill should:
- refine the architecture
- define detailed design artifacts
- APIs
- workflows
- persistence design
- module specs
- interface contracts

Major skills catalog discussed:
- delivery_methodology_advisor
- business_analysis_from_sources
- data_model_from_ba
- system_architecture_from_ba_and_data
- system_design_from_architecture

---

## 17. Commands and Skills

A key design discussion was the relationship between commands and skills.

- **Command** = what the user wants to do
- **Skill** = how AI should do it

`commands.json` should define:
- command name
- label
- phase
- intent
- whether AI is required
- linked skill

Skill files should define:
- purpose
- methodology
- required input types
- optional input types
- output types
- completion criteria
- constraints

The connection is:
- command selects the skill
- skill provides the method
- runtime context completes the execution

Multiple skill files are preferable to one large skills file.

---

## 18. Runtime Context and Placeholder Resolution

Static command and skill files are not enough by themselves.

A runtime layer must resolve placeholders such as:
- `{requirements-json}`
- `{use-cases-dir}/*.md`
- `{business-functions}`

The runtime layer resolves these against the current workspace/project state.

The AI should not resolve placeholders itself.
It should receive already resolved context or an instruction bundle that performs dynamic expansion appropriately.

---

## 19. Claude / Gemini / Codex Interaction Model

A key discussion was how the model is actually invoked when the user types directly into AI tooling such as Codex or Gemini.

Important conclusions:
- raw AI consoles do not natively know `commands.json` or `skills.json`
- a runtime interpretation layer or prompt convention is needed
- Claude Code supports custom slash commands with markdown files and shell-expansion (`!`) which can act as the runtime bridge
- Gemini tends to treat custom schema fields as prompt guidance rather than hard contracts
- plan-based Codex has usage limits and is better suited as a development assistant than a production orchestration engine

For Claude specifically, generated command/prompt files with shell expansion provide a strong non-API runtime mechanism.

---

## 20. Trust Model

For developer/self-hosted mode, the trust issue is not only storage of API keys but what the tool can do with them.

Trust should be reduced through:
- explicit task contracts
- visible commands and skills
- file allowlists
- preview before send
- local logging
- dry run mode
- bounded command behavior
- explicit write permissions
- visible prompts/templates

User-initiated, model-governed AI execution is the right pattern.

---

## 21. VA Help Site / Reference Site Direction

The discussion concluded that a help/reference site should not start by reinventing all BA content.

It should link to and build upon existing strong references such as:
- IIBA BABOK / Business Analysis Standard / Glossary / KnowledgeHub
- APQC Process Classification Framework
- OMG BPMN
- OMG DMN

The site should eventually contain:
- BA foundations
- domain identification guidance
- business capability guidance
- process/rule/data modeling references
- domain packs
- AI-MDE-specific method guidance

---

## 22. Overall Product View Emerging

The AI-MDE product is evolving into a guided engineering platform with major expertise areas:

- Delivery Methodology
- Business Analysis
- Data Modeling
- System Architecture
- System Design

The product should:
- lead discovery
- structure evidence
- ask focused questions
- preserve traceability
- support hybrid documentation
- derive business capabilities and use cases
- derive/validate data model
- derive architecture
- refine detailed system design
- adapt behavior to the selected lifecycle methodology

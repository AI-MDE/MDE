# AI-MDE Business Analysis Methods Guide

## 1. Purpose

This guide defines the Business Analysis (BA) methods to be used by AI-MDE.

It consolidates the working method discussed for:
- discovery from mixed source materials
- business domain handling
- business capabilities
- use cases
- business events
- roles, actors, and stakeholders
- business rules
- hybrid documentation handling
- downstream design impact
- data model readiness
- AI-led clarification and audit trail

The purpose of this guide is to make the BA stage:
- disciplined
- repeatable
- traceable
- design-relevant
- suitable for both human analysts and AI-assisted execution

---

## 2. BA Method Overview

AI-MDE should not begin by asking for a formal requirements document.

Instead, the BA method should follow this pattern:

**Raw Inputs -> Discovery -> Business Analysis Baseline -> Business Capabilities -> Use Cases -> Business Rules / Events / Roles -> Data Model Readiness -> Architecture Readiness**

The BA stage should:
- absorb messy source inputs
- extract structured business meaning
- identify missing information
- ask targeted clarification questions
- preserve unresolved items in a queue
- maintain full audit trail
- build a baseline that is good enough for later data modeling and architecture

---

## 3. Core Principles

The BA method should follow these principles:

- evidence before opinion
- project artifacts before external assumptions
- AI leads discovery, user validates and clarifies
- uncertainty must remain visible
- unresolved items go to queue, not hidden assumptions
- business analysis comes before architecture
- hybrid documentation should be classified, not discarded
- every major BA element should be linked to downstream design impact
- traceability must be preserved from source to design

---

## 4. Discovery Method

### 4.1 Goal

Discovery is the stage where AI-MDE reads whatever source material the user provides and begins extracting structured business meaning.

The user may provide:
- notes
- requirement fragments
- process descriptions
- forms
- screenshots
- reports
- spreadsheets
- emails
- diagrams
- table structures
- sample data
- technical documents
- system design fragments

### 4.2 Discovery Tasks

During discovery, AI-MDE should:
- classify source artifacts
- extract findings
- normalize terminology
- identify likely business concepts
- identify contradictions and ambiguities
- identify missing information
- preserve non-BA content for later phases

### 4.3 Discovery Outputs

Discovery should produce:
- source inventory
- discovery findings
- terminology map
- assumptions register
- conflict register
- open issues queue
- first-pass requirement/capability candidates

---

## 5. Hybrid Documentation Handling

AI-MDE must assume that source materials may be hybrid.

Source artifacts may mix:
- business requirements
- process descriptions
- design fragments
- architecture hints
- diagrams
- APIs
- data structures
- tables
- sample data
- technical implementation details

### 5.1 Rule

AI-MDE should:
- extract business meaning wherever possible
- avoid treating design as automatically approved business truth
- classify source fragments by evidence type
- preserve technical/design artifacts for later phases

### 5.2 Suggested Evidence Categories

Source fragments should be classified as one or more of:
- business requirement evidence
- business rule evidence
- process/workflow evidence
- business capability evidence
- use case evidence
- business event evidence
- role/actor evidence
- data/entity evidence
- architecture/design evidence
- technical implementation evidence
- sample/reference data
- ambiguous/mixed

### 5.3 Why It Matters

Hybrid documentation often contains very useful clues:
- table names reveal business entities
- sample data reveals statuses and categories
- diagrams reveal workflow intent
- forms reveal required fields
- APIs reveal business objects and interactions

These should be preserved and reused later, especially in data modeling and architecture.

---

## 6. Audit Trail and Traceability

The BA process must produce a full audit trail.

It should record:
- what source artifacts were used
- what findings were extracted
- what questions were asked
- why each question was asked
- how the user answered
- what changed because of the answer
- what remains unresolved
- which content is explicit, inferred, assumed, conflicting, or unresolved

### 6.1 Trace Chain

Recommended trace chain:

**Source artifact -> Discovery finding -> Clarification question -> User answer -> Requirement update -> BA section -> Design driver**

### 6.2 Required Registers

The BA method should maintain:
- clarification log
- assumptions register
- conflict register
- open issues / queue
- traceability matrix
- change log

---

## 7. Domain Handling Method

### 7.1 Purpose

AI-MDE should identify and record the business domain early, but only after reading the source material.

### 7.2 Correct Behavior

AI Should:
1. read the source material first
2. try to infer the likely business domain
3. record candidate domain and confidence
4. ask the user only if confidence is insufficient or the domain appears mixed
5. allow the user to state that the project is:
   - domain-specific
   - cross-domain
   - a generic tool/platform
6. ask whether domain-expert guidance should be used only when relevant
7. record the domain conversation under the `ba` folder

### 7.3 Business Domain

The **business domain** is the business context the solution belongs to.

Examples:
- insurance claims
- procurement
- healthcare scheduling
- HR onboarding
- loan processing
- generic platform/tooling

### 7.4 Domain Reference Policy

If the project is domain-specific or cross-domain, AI-MDE should ask whether domain guidance may be used.

Allowed modes:
- project artifacts only
- project artifacts plus domain guidance
- domain guidance as suggestions only

Project artifacts remain the primary source of truth.

---

## 8. Business Capabilities

### 8.1 Definition

**Business capabilities** describe the major business-level things the target application is expected to support from the business user’s point of view.

They do not mean departments or organizational functions.

### 8.2 Examples

For a claims solution:
- Claim Intake
- Claim Review
- Claim Decisioning
- Payout Management
- Status Tracking
- Document Management
- Notification Management
- Reporting and Oversight

### 8.3 Why They Matter

Business capabilities provide a stable structure between:
- business problem and scope
- use cases
- requirements
- architecture and design

Progression:

**Business Domain -> Business Capabilities -> Use Cases -> Requirements -> Design**

### 8.4 AI-MDE Guidance

AI should:
- derive business capabilities from validated findings
- avoid making them too technical
- avoid confusing them with organizational departments
- use them as the main grouping layer for use cases and requirements

---

## 9. Use Cases

### 9.1 Definition

A **use case** describes a **goal-oriented sequence of interactions** between a primary actor and the target solution that produces an **observable business result of value**.

A use case is:
- driven by an actor goal
- broader than a single operation or UI action
- narrower than a full end-to-end business process across the enterprise
- suitable for organizing functional requirements, alternate flows, exceptions, and downstream design work

### 9.2 What a Use Case Is Not

A use case is **not**:
- a single button click
- a single CRUD operation
- a single field update
- a low-level technical service call
- an internal algorithm
- a purely internal system routine with no actor goal or externally visible result

Examples of things that are usually not use cases:
- Approve button clicked
- Update invoice status
- Save claim record
- Recalculate tax
- Send notification email

These are usually better classified as:
- task
- step
- operation
- internal process step
- technical behavior

### 9.3 Use Case vs Capability vs Process

#### Business Capability
A high-level business ability the application supports.

#### Use Case
A goal-based interaction that delivers value for an actor.

#### Task / Step
A smaller action that occurs inside a use case.

#### Business Process
A broader workflow that may span multiple actors, departments, systems, or organizational stages.

### 9.4 Example

**Approve Invoice** is usually a task or step.

**Review and Approve Invoice** can be a use case because it includes:
- locate invoice
- review it
- validate it
- make decision
- record outcome
- advance business flow

### 9.5 Use Case Structure

A use case entry should preferably include:
- name
- goal
- primary actor
- supporting actors
- trigger
- preconditions
- main success flow
- alternate flows
- exception flows
- postconditions / outcome
- related business rules
- related capabilities
- related data/entities

---

## 10. Deriving Use Cases from Business Capabilities

### 10.1 Principle

A business capability describes a major business-level ability the application supports.

A use case describes a goal-oriented interaction that helps a user realize part of that capability.

### 10.2 Method

When deriving use cases from business capabilities, AI-MDE should:

1. start from validated capabilities
2. identify the primary actors involved in each capability
3. identify the meaningful goals those actors pursue
4. derive use cases around those goals
5. avoid producing use cases that are only isolated CRUD operations
6. avoid producing use cases that are purely internal system behavior
7. preserve traceability from capability -> use case -> requirement -> design

### 10.2A Use Case Granularity Decision Rule

AI-MDE should apply this rule before finalizing use case boundaries:

1. prefer one use case per actor-goal outcome, not one use case per UI action or CRUD step
2. treat actions like submit, update, cancel, approve, reject, save, and notify as steps/flows unless they satisfy standalone criteria
3. allow a standalone use case for an action only when all are true:
   - it has a distinct business trigger
   - it has a distinct actor goal and business outcome
   - it has materially different business rules or policy decisions
   - it has materially different postconditions or audit/compliance consequences
4. if standalone criteria are not met, fold the action into a broader lifecycle use case as a main, alternate, or exception flow
5. when uncertainty remains, ask a targeted clarification question and keep the current split/merge decision explicit in the analysis notes

### 10.3 Example

#### Capability
Claim Review

#### Candidate Use Cases
- Review Claim
- Request Additional Information
- Escalate Claim for Supervisor Review
- Review Claim and Make Decision

### 10.4 When to Ask Questions

AI-MDE should ask clarification questions if:
- a capability has no obvious actor
- a capability is too broad
- multiple capabilities overlap
- the expected business outcome is unclear
- candidate use cases drift into technical implementation detail

---

## 11. Business Events

### 11.1 Definition

A **business event** is a business-significant occurrence that affects a business object, business state, business obligation, or business process, and has a meaningful consequence for business behavior, decision-making, or outcomes.

### 11.2 Key Rule

Not every system event is a business event.

A business event must matter to the business, not merely to the software implementation.

### 11.3 Examples of Business Events

- Claim Submitted
- Claim Approved
- Claim Denied
- Payment Failed
- Contract Expired
- Invoice Received
- Invoice Approval Completed
- Policy Renewed

### 11.4 Examples of Non-Business Events

Usually not business events by themselves:
- button clicked
- record inserted
- cache refreshed
- background job completed
- email API returned success
- log entry written

These may be technical/system events or consequences of a business event.

### 11.5 AI-MDE Guidance

AI-MDE should classify candidate events as:
- business event
- system/technical event
- user action/task
- process step
- rule outcome
- unresolved/needs clarification

### 11.6 Why Business Events Matter

Business events often:
- trigger processes
- trigger use cases
- trigger notifications
- trigger deadlines or escalations
- change state
- require audit/history tracking
- drive event-driven integrations

---

## 12. Roles, Actors, and Stakeholders

### 12.1 Actor

An **actor** is the role interacting with the system in a use case.

Examples:
- Claimant
- Claims Agent
- Supervisor
- Approver

### 12.2 Stakeholder

A **stakeholder** is a person or group with an interest in the system, whether or not they directly use it.

Examples:
- Operations Manager
- Compliance Officer
- Finance Team
- Customer Support

### 12.3 Role

A **role** is a responsibility-bearing perspective that may be used for:
- actors
- approvals
- reporting
- ownership
- routing

### 12.4 AI-MDE Guidance

AI-MDE should:
- identify actors from use cases and workflows
- identify stakeholders from goals, constraints, governance, and reporting needs
- identify roles that affect routing, approval, access, and accountability

---

## 13. Business Rules

### 13.1 Definition

A **business rule** is a rule that constrains behavior, decisions, validations, routing, calculations, eligibility, or outcomes in the business domain.

### 13.2 Examples

- claims above threshold require supervisor approval
- incomplete claims cannot proceed
- payout cannot exceed approved amount
- invoices older than X days require escalation

### 13.3 AI-MDE Guidance

AI-MDE should:
- extract explicit rules from source materials
- infer candidate rules carefully and label them as inferred
- attach rules to use cases, capabilities, events, and entities where applicable
- identify unresolved rule gaps and queue them for clarification

---

## 14. Business Objects / Entities

### 14.1 Definition

Business objects or entities are the core business concepts the system manages.

Examples:
- Claim
- Claimant
- Invoice
- Approval Decision
- Supporting Document
- Policy
- Payment

### 14.2 AI-MDE Guidance

AI-MDE should:
- identify business objects early
- normalize synonyms
- connect them to capabilities, use cases, rules, and events
- preserve them for data modeling

### 14.3 Naming Rule (Business First)

Business object/entity names should be understandable to business stakeholders and describe the business object boundary, not storage mechanics.

AI-MDE should:
- prefer `Business Object + Purpose` naming (for example, `Leave Request History`)
- include scope explicitly when needed (for example, prefer `Leave Request History` over generic `Leave History`)
- avoid mechanical display names such as `Entry`, `Row`, `Log Table`, `Entity Table`, or transport/storage-specific terms
- keep technical names as aliases/mappings only (for example business name `Leave Request History`, technical alias `leave_audit_entries`)
- preserve a naming note when a legacy technical term must remain for compatibility

---

## 15. Business Processes

### 15.1 Definition

A **business process** is a broader workflow that may span multiple actors, roles, systems, and stages.

Examples:
- Invoice Approval Process
- Claim Handling Process
- Procurement Approval Workflow

### 15.2 Distinction

A business process is broader than a use case.

A use case is usually one actor-goal slice within or alongside a broader process.

---

## 16. Clarification Method

### 16.1 Principle

AI-MDE should not ask a giant questionnaire.

It should ask only the next highest-value questions.

### 16.2 Question Quality Rules

Each clarification question should include:
- why it is relevant
- current understanding
- likely answer candidates when appropriate
- option for custom answer
- option to defer to queue

### 16.3 Supported Answer Modes

- single-select with edit
- multi-select with edit
- free text
- defer to queue/work backlog

### 16.4 Queue Rule

If a question cannot be answered now, it should remain visible in a queue instead of being silently assumed.

---

## 17. Downstream Design Impact of BA Elements

Every major BA element should be analyzed not only for its business meaning, but also for its likely downstream impact on data model, architecture, workflow, UI, integration, security, validation, and system design.

### 17.1 Business Domain
Influences:
- terminology
- compliance and regulatory expectations
- likely domain boundaries
- likely integration expectations
- data sensitivity
- reporting expectations

### 17.2 Business Capability
Influences:
- module decomposition
- major feature grouping
- bounded contexts
- major UI/application areas
- service or subsystem boundaries

### 17.3 Use Case
Influences:
- workflow behavior
- interaction flows
- API interactions
- validation points
- exception handling
- test scenarios
- audit trail requirements

### 17.4 Business Event
Influences:
- triggers
- state transitions
- notification triggers
- async processing
- SLA timers
- event-driven integration design

### 17.5 Roles / Actors
Influence:
- access control
- authorization
- workflow routing
- approval chains
- UI personalization
- accountability and audit

### 17.6 Stakeholders
Influence:
- reporting
- governance
- approval requirements
- non-functional constraints
- success criteria

### 17.7 Business Rules
Influence:
- validation logic
- routing logic
- calculation logic
- decision services
- policy engines
- test cases

### 17.8 Business Objects / Entities
Influence:
- conceptual and logical data model
- schema
- APIs
- forms
- reports

### 17.9 Business Process
Influence:
- end-to-end orchestration
- handoffs
- states
- escalations
- workflow design
- monitoring and visibility

---

## 18. Data Model Readiness

Once BA is sufficiently stable, AI-MDE should either:
- derive a conceptual/logical data model, or
- review an existing one

### 18.1 Data Modeling Readiness Inputs

The following BA outputs are especially important:
- business domain
- business capabilities
- use cases
- business rules
- business events
- roles/actors
- business objects/entities
- sample data and hybrid documentation

### 18.2 Completeness Check

AI-MDE should validate the data model against the BA baseline by classifying significant nouns and concepts as one of:
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

Important rule:
Do not force every noun into an entity.

---

## 19. Roles of AI-MDE in the BA Stage

During BA, AI-MDE should act as:
- discovery assistant
- terminology normalizer
- structured clarifier
- capability/use case derivation assistant
- business event detector
- business rule extractor
- data-model readiness assessor
- traceability maintainer

It should not:
- pretend certainty where none exists
- jump prematurely into architecture
- turn technical fragments into confirmed business requirements without caution
- force answers when queueing is more honest

---

## 20. Recommended BA Outputs

The BA stage should produce or maintain:

- source inventory
- discovery findings
- terminology map
- domain context
- business capabilities
- use cases
- business events
- roles/actors/stakeholders
- business rules catalog
- business object/entity catalog
- assumptions register
- conflict register
- clarification log
- open issues queue
- business analysis document
- traceability matrix
- change log
- data model readiness notes

---

## 21. Summary

AI-MDE Business Analysis is intended to be:
- AI-led but user-validated
- standards-informed
- evidence-based
- document-centric
- traceable
- lifecycle-aware
- useful for downstream data modeling and design

The key structural progression is:

**Domain -> Capabilities -> Use Cases -> Rules / Events / Roles / Entities -> Data Model Readiness -> Architecture Readiness**

That progression should guide the BA method consistently.

---

## 22. Mandatory Change-Request Workflow

When a change request is introduced (for example in `Requests/*.md`), AI-MDE must follow this mandatory sequence:

1. `evaluate_change_request`
2. `refine_business_requirements`
3. `elaborate_system_design`
4. `validate_design_compliance`
5. `validate_traceability`
6. `generate_diagrams`

### 22.1 Enforcement Rules

- Do not skip or reorder the sequence above.
- Do not update design modules, module catalog, or source code before impact analysis is complete.
- If clarification questions are open after impact analysis, stop and resolve them (or record explicit accepted assumptions) before continuing.
- Requirement updates must be completed before design updates.
- Design validation and traceability validation are mandatory before finalizing change implementation artifacts.

### 22.2 Why This Is Mandatory

This sequence ensures:
- change impact is explicit before modifications
- BA remains the source of truth for design evolution
- module catalog and module specs remain synchronized
- traceability is preserved from change request to final artifacts

### 22.3 Mandatory Request Folder Artifacts

For each request, AI-MDE must create a dedicated folder:

`project/change-requests/{request-slug}/`

Minimum required artifacts:
- `request.md` (copy of source request from `Requests/*.md`)
- `manifest.json` (request-level command/status/output index)
- `impact/impact-report.md`
- `impact/clarification-questions.md`
- `ai/01-evaluate-change-request.md`
- `ai/02-refine-business-requirements.md`
- `ai/03-elaborate-system-design.md`
- `ai/04-validate-design-compliance.md`
- `ai/05-validate-traceability.md`
- `ai/06-generate-diagrams.md`
- `changes/doc-changes.md`
- `changes/code-changes.md`

Each command in the mandatory workflow must update its matching `ai/*.md` response file and append changed files to the corresponding `changes/*.md` log.

# AI-MDE Proposal
## AI-Led Business Analysis for Model-Driven Engineering

## 1. Executive Summary

AI-MDE should not begin by asking users for a formal requirements document, a Zachman output, or a fully articulated business specification. In real projects, users rarely possess a clean requirements package. They usually have a mix of notes, spreadsheets, forms, screenshots, reports, emails, current process descriptions, and pain points.

This proposal defines **AI-MDE** as an **AI-led Business Analysis capability** that:

- ingests raw project artifacts and rough user input
- analyzes and structures business knowledge from those inputs
- detects gaps, contradictions, and unresolved assumptions
- asks targeted clarification questions
- maintains a complete audit trail of questions, answers, assumptions, and changes
- produces a structured, traceable **Business Analysis baseline**
- uses that baseline later to derive architecture and system design

The core idea is simple:

**Raw Inputs -> Discovery -> Guided Clarification -> Business Analysis Baseline -> Architecture and Design**

This makes AI-MDE more practical, more credible, and more useful than tools that demand polished requirements upfront.

---

## 2. Problem Statement

Most software and transformation initiatives start with incomplete, fragmented, and inconsistent information. Stakeholders often know what is painful in the current process, what outcomes they want, and what artifacts they use, but they cannot easily express those needs as structured requirements.

Traditional intake approaches fail because they often assume the user can provide:

- a formal requirements document
- a business architecture artifact
- a complete enterprise analysis framework output
- a clean functional specification

In many cases, that expectation is unrealistic.

AI-MDE addresses this problem by shifting the burden of analysis from the user to the AI. The user provides whatever material exists. AI-MDE takes the lead in discovery, requirement development, and structured business analysis.

---

## 3. Proposed Positioning for AI-MDE

AI-MDE should be positioned as:

> **A standards-aligned, AI-led business analysis and model-driven engineering assistant that analyzes raw project materials, identifies missing information, asks targeted clarification questions, maintains a full audit trail, and produces a structured BA baseline ready for architecture and design.**

This is stronger than positioning it as:

- an AI that writes specs
- a command-driven requirement tool
- a replacement for a certified business analyst

It is better described as a disciplined, evidence-driven analysis engine that supports discovery and design readiness.

---

## 4. Why This Approach Is Better

### 4.1 Better than asking for a requirements document

Most users do not have one.

### 4.2 Better than asking for a Zachman output

Most users cannot produce one, and it is often too abstract as an intake mechanism.

### 4.3 Better than a command-driven UX

Users should not need to know which analysis step comes next. AI-MDE should lead the process.

### 4.4 Better than jumping straight to architecture

Architecture without a disciplined BA stage usually bakes assumptions into design too early.

---

## 5. Guiding Principles

AI-MDE should operate on the following principles:

1. **AI leads the process**
   The user provides material and answers questions. AI-MDE orchestrates discovery.

2. **Evidence over guesswork**
   Project artifacts and stakeholder answers are the primary source of truth.

3. **Standards-aligned method**
   The BA stage should align with recognized BA and requirements-engineering practices.

4. **Traceability by design**
   Every major statement in the BA baseline should be traceable to artifacts, questions, answers, or explicit assumptions.

5. **Progressive refinement**
   Requirements are discovered and refined iteratively, not demanded upfront.

6. **No fake certainty**
   AI-MDE should distinguish between explicit facts, inferences, assumptions, and open issues.

7. **BA before architecture**
   The architecture stage should consume an approved or stable BA baseline, not raw notes.

---

## 6. Reference Foundation

AI-MDE should not claim authority based on personality or unsupported expertise. Its credibility should come from applying recognized references and methods.

### 6.1 BA and analysis references

AI-MDE should align with the discipline represented by:

- **IIBA BABOK Guide**
- **PMI Guide to Business Analysis / Business Analysis for Practitioners**
- **ISO/IEC/IEEE 29148** for requirements engineering and quality

### 6.2 Project-specific evidence

The real project truth comes from:

- source documents
- spreadsheets
- emails
- SOPs
- screenshots
- reports
- current system outputs
- user answers
- organizational policies
- domain regulations where applicable

### 6.3 Proper claim

AI-MDE should say:

> It applies recognized business analysis and requirements-engineering practices to project-specific evidence, while maintaining a full traceable audit trail for human review.

---

## 7. Scope of the BA Stage

The BA stage in AI-MDE should be responsible for:

- intake of messy source material
- extraction of business knowledge
- stakeholder and role identification
- process and workflow discovery
- business rule extraction
- data/entity/artifact identification
- gap analysis
- contradiction detection
- clarification questioning
- requirement baseline development
- design-readiness assessment

It should **not** claim to replace stakeholder accountability, final approval, or domain expert judgment.

---

## 8. Inputs to the BA Stage

AI-MDE should accept any useful source material, including:

- notes
- process descriptions
- forms
- spreadsheets
- reports
- screenshots
- emails
- SOPs
- templates
- current system outputs
- sample cases
- rough goals
- pain points and complaints

The user should not need to pre-structure these materials.

---

## 9. AI-Led Operating Model

The user should not be expected to drive the process with commands. AI-MDE should take the lead.

### 9.1 User role

The user should mainly:

- upload or describe what they have
- answer targeted questions
- review drafts
- correct misunderstandings
- confirm or reject assumptions
- approve progression

### 9.2 AI-MDE role

AI-MDE should automatically:

- inspect source artifacts
- extract findings
- normalize terms
- detect missing information
- identify contradictions
- generate the next best questions
- update the BA baseline
- maintain the audit trail
- decide when the BA baseline is design-ready

---

## 10. BA Stage Flow

The BA stage should operate as a structured loop.

### Step 1: Intake and Classification
Analyze all source materials and create a source inventory.

**Output:**
- source register
- source metadata
- source relevance and confidence tags

### Step 2: Extraction
Extract structured business information from all sources.

**What to extract:**
- goals
- actors
- workflow steps
- artifacts
- rules
- integrations
- constraints
- pain points
- ambiguities

**Output:**
- discovery findings

### Step 3: Consolidation and Normalization
Merge duplicates, normalize terminology, and detect contradictions.

**Output:**
- terminology map
- normalized findings
- conflict register

### Step 4: Guided Clarification
Generate and ask the highest-value questions needed to close major gaps.

**Output:**
- clarification log
- answered questions
- unresolved questions

### Step 5: Requirement Shaping
Convert findings and answers into structured requirements.

**Output:**
- business requirements
- functional requirements
- non-functional requirements
- business rules catalog
- entity and artifact catalog

### Step 6: BA Document Generation
Generate and continuously update the structured Business Analysis document.

**Output:**
- BA baseline
- BA document draft
- design driver summary

---

## 11. Question Strategy

The AI should ask the questions, not wait for the user to know what to request next.

### 11.1 Question categories

AI-MDE should ask focused questions in areas such as:

- business problem and goals
- scope and boundaries
- users and roles
- process steps and decisions
- exceptions and alternate flows
- inputs and outputs
- business rules and thresholds
- integrations
- audit and reporting needs
- non-functional constraints

### 11.2 Question quality rules

Questions should be:

- few in number
- high-value
- grouped by topic
- directly tied to gaps found in source evidence
- prioritized by architecture and business impact

AI-MDE should avoid flooding users with long generic questionnaires.

---

## 12. Audit Trail Requirement

A full audit trail is mandatory.

The BA stage should preserve:

- source artifacts used
- findings extracted from them
- questions asked
- reason each question was asked
- user answers
- assumptions made
- conflicts found
- changes to the requirement baseline
- links from evidence to BA sections and design drivers

### 12.1 Why this matters

Without an audit trail, the BA baseline becomes a black box.

With an audit trail, reviewers can always ask:

- Why is this requirement here?
- Which answer introduced this rule?
- Is this an explicit fact or an inference?
- What changed between versions?

---

## 13. Required Traceability Chain

AI-MDE should support this chain:

**Source Artifact -> Discovery Finding -> Clarification Question -> User Answer -> Requirement Update -> BA Section -> Design Driver**

That chain is central to trust, quality, and later system design.

---

## 14. Information Status Model

Every meaningful item in the BA stage should be labeled as one of the following:

- **Explicit** - directly stated in a source or by the user
- **Inferred** - reasonably concluded from patterns or multiple signals
- **Assumed** - temporary placeholder due to missing information
- **Pending Confirmation** - identified but not yet confirmed
- **Conflicting** - contradicted by another source or answer
- **Confirmed** - validated by user or authoritative source
- **Superseded** - replaced by newer confirmed information

This prevents fake certainty and improves trust.

---

## 15. Core BA Outputs

The BA stage should produce the following deliverables.

### 15.1 Source Inventory
A structured list of all source material used.

### 15.2 Discovery Findings
A categorized set of extracted observations and candidate facts.

### 15.3 Clarification Log
A full record of questions, answers, reasons, and impact.

### 15.4 Assumption Register
All temporary assumptions awaiting validation.

### 15.5 Conflict Register
Contradictions across source material or user answers.

### 15.6 Requirement Baseline
Structured requirements derived from source evidence and clarification.

### 15.7 Business Rules Catalog
A formal list of rules, triggers, conditions, effects, and exceptions.

### 15.8 Entity and Artifact Catalog
Definitions of business entities, documents, inputs, outputs, and lifecycle roles.

### 15.9 Business Analysis Document
The main structured analysis document used later for architecture.

### 15.10 Design Driver Summary
The subset of requirements most likely to shape solution architecture.

### 15.11 Traceability Matrix
A matrix linking source, finding, question, answer, requirement, and BA section.

### 15.12 Change Log
A record of how the baseline evolved over time.

---

## 16. Standard Business Analysis Document Structure

AI-MDE should use a stable template for the BA document.

```markdown
# Business Analysis Document

## 1. Executive Summary
## 2. Business Problem and Objectives
## 3. Scope and Out of Scope
## 4. Stakeholders and User Roles
## 5. Current State Overview
## 6. Pain Points and Gaps
## 7. Target Business Capabilities
## 8. Business Process Overview
## 9. Business Rules and Decision Logic
## 10. Functional Requirements
## 11. Non-Functional Requirements
## 12. Data and Business Entities
## 13. Inputs, Outputs, and Artifacts
## 14. External Systems and Integrations
## 15. Risks, Assumptions, and Dependencies
## 16. Open Questions and Unresolved Items
## 17. Prioritization
## 18. Design Readiness Summary
```

---

## 17. Internal BA Objects for AI-MDE

To support structured operation, AI-MDE should maintain internal objects such as:

### SourceArtifact
Represents one input source.

Suggested fields:
- id
- title
- type
- owner
- date
- content reference
- authority level
- tags

### DiscoveryFinding
Represents one extracted fact, observation, or inference.

Suggested fields:
- id
- category
- statement
- source references
- confidence
- explicit or inferred
- related entities
- related workflow step

### ClarificationQuestion
Represents one question generated by AI-MDE.

Suggested fields:
- id
- category
- question text
- reason
- priority
- affects sections
- blocking for design

### AnswerLogEntry
Represents the response to one question.

Suggested fields:
- id
- question id
- answer text
- answered by
- answered at
- confidence

### RequirementItem
Represents one normalized requirement.

Suggested fields:
- id
- type
- statement
- rationale
- source references
- status
- priority

### BusinessRule
Represents one rule or decision condition.

Suggested fields:
- id
- trigger
- condition
- effect
- exceptions
- source references

### BusinessEntity
Represents one business concept.

Suggested fields:
- name
- description
- attributes
- lifecycle relevance
- related artifacts

### ArtifactDefinition
Represents a business artifact or document.

Suggested fields:
- name
- purpose
- producer
- consumer
- required fields
- lifecycle
- storage location if known

### RequirementChangeEntry
Represents one baseline change caused by clarification or new evidence.

Suggested fields:
- id
- triggered by question
- triggered by answer
- affected object
- previous value
- new value
- rationale
- changed at

---

## 18. What “Done” Means for the BA Stage

The BA stage is ready to hand over to architecture when:

- the business problem is clear
- scope is reasonably bounded
- the main actors are known
- the core workflow is understood
- key business entities and artifacts are identified
- major business rules are captured
- key non-functional constraints are visible
- main integrations are identified
- significant contradictions are resolved or explicitly logged
- architecture-driving requirements are visible

This does not require perfect certainty. It requires enough structured clarity for grounded design.

---

## 19. Bridge to Architecture

The BA stage should explicitly identify **design drivers** that will shape architecture, such as:

- approval workflow complexity
- audit and traceability requirements
- document lifecycle control
- external system integration
- configurable business rules
- role-based access control
- reporting and analytics needs
- performance constraints
- retention and compliance requirements
- multi-tenant support if applicable

These design drivers become the formal handoff into the architecture stage.

---

## 20. Recommended AI-MDE User Experience

The user experience should feel like this:

1. User uploads or describes whatever they have.
2. AI-MDE analyzes the material.
3. AI-MDE identifies what is known and what is missing.
4. AI-MDE asks the next best clarification questions.
5. AI-MDE updates the BA baseline and audit trail.
6. AI-MDE produces a progressively improving BA output.
7. AI-MDE determines when the BA baseline is mature enough for architecture.

The user should not need to drive the tool with technical commands.

---

## 21. Recommended V1 Scope

For the first strong version of AI-MDE, the BA capability should focus on:

- multi-artifact intake
- structured extraction of business findings
- terminology normalization
- contradiction detection
- targeted question generation
- requirement baseline generation
- business rule extraction
- entity and artifact cataloging
- complete clarification and change audit trail
- BA document generation
- design driver identification
- traceability back to evidence

This is already substantial and valuable without overreaching.

---

## 22. Benefits

If implemented this way, AI-MDE will provide these benefits:

- lowers the burden on users who cannot articulate requirements formally
- improves requirement quality before architecture starts
- increases trust through transparency and auditability
- reduces hidden assumptions
- keeps architecture grounded in evidence
- supports iterative refinement instead of one-time intake failure
- creates reusable, traceable project knowledge

---

## 23. Risks and Safeguards

### Risk: AI invents certainty
**Safeguard:** force explicit labeling of fact, inference, assumption, and open issue.

### Risk: Users are overwhelmed by questions
**Safeguard:** limit each round to the highest-value questions only.

### Risk: Conflicting source materials create ambiguity
**Safeguard:** keep a conflict register and never silently resolve major contradictions.

### Risk: Output becomes generic and detached from reality
**Safeguard:** anchor all major findings and requirements to source evidence and clarification history.

### Risk: AI-MDE is challenged on credibility
**Safeguard:** align method to recognized BA and requirements-engineering references, and make the audit trail reviewable.

---

## 24. Recommended Proposal Statement

AI-MDE should be developed as an **AI-led Business Analysis engine** for model-driven engineering.

Its role is to transform fragmented project inputs into a structured, traceable, and design-ready BA baseline by:

- applying recognized business analysis discipline
- using project evidence as the primary truth source
- identifying missing information and contradictions
- asking targeted clarification questions
- maintaining a full audit trail
- producing a BA document suitable for later architecture and system design

This is the correct foundation for the broader AI-MDE vision.

---


## 25. Role of MDE in the BA Stage

The **MDE** part of AI-MDE should not be treated as branding only. It should play a concrete orchestration role around the AI-driven BA process.

Without MDE, the AI is mainly a smart assistant reacting to prompts. With MDE, the process becomes governed, stateful, traceable, and repeatable.

### 25.1 MDE as orchestrator and state manager

In this model:

- **AI** performs extraction, interpretation, question generation, clarification, and structured rewriting
- **MDE** provides method, structure, state control, file watching, impact mapping, and re-evaluation orchestration

MDE should therefore be responsible for:

- defining the BA methodology and operating rules
- defining the tracked artifact types and folder structure
- defining the lifecycle states of sources, questions, requirements, and BA readiness
- watching tracked files and folders for meaningful changes
- deciding what needs to be re-evaluated when changes occur
- invoking the AI with the correct context and instructions
- preserving audit trail, traceability, and change history
- deciding when the BA baseline is stable enough to move forward

### 25.2 File watching and targeted re-evaluation

MDE should support a watched BA workspace, for example:

```text
/ba/sources/
/ba/questions/
/ba/topics/
/ba/answers/
/ba/config/
```

When a tracked file changes, MDE should not simply re-run everything. It should determine the impacted analysis objects and trigger **targeted AI re-evaluation**.

Examples:

- if a source document changes, refresh findings tied to that source
- if a pending question file is answered, parse the answer and update linked requirements and rules
- if a topic document changes, re-evaluate only the affected BA area
- if an answer invalidates an earlier assumption, mark related assumptions stale and update the baseline

### 25.3 MDE event flow

A typical event-driven cycle should work like this:

1. a tracked file changes
2. MDE detects the change
3. MDE maps the change to impacted BA objects
4. MDE invokes the AI with the changed context and re-evaluation instructions
5. AI refreshes findings, requirements, rules, and BA sections
6. MDE records the delta in the audit trail and updates state

### 25.4 MDE-managed lifecycle and states

This is where the model-driven aspect becomes concrete. MDE should manage lifecycle states such as:

#### Source state
- new
- analyzed
- changed
- superseded

#### Question state
- drafted
- asked
- answered
- reviewed
- resolved
- follow-up-needed

#### Requirement state
- extracted
- inferred
- assumed
- confirmed
- disputed
- superseded

#### BA stage state
- intake
- discovery-active
- clarification-needed
- baseline-drafting
- baseline-stable
- design-ready

These states allow MDE to control progression instead of relying on ad hoc prompting.

### 25.5 MDE-to-AI instruction model

When MDE detects change, it should send targeted instructions to the AI rather than a vague request to “re-evaluate everything.”

A strong instruction should include items such as:

- changed artifact identifier
- impacted BA objects
- linked assumptions or open issues
- affected outputs to refresh
- required audit trail updates
- whether only deltas or full section refreshes are needed

Example:

- changed artifact: `approval-flow.md`
- impacted objects: approval rules, workflow routing, role definitions
- linked open issue: approver authority threshold
- outputs to refresh: `business-rules.md`, `requirements.md`, `business-analysis-document.md`, `clarification-log.md`
- required action: update only impacted sections and record before/after delta

### 25.6 Practical value of MDE in this proposal

This gives MDE a clear and non-trivial role.

MDE is what turns the BA capability from “AI helps write documents” into a **model-driven engineering process** with:

- explicit models
- explicit states
- explicit transitions
- watched artifacts
- controlled re-evaluation
- traceable outputs
- repeatable progression toward design readiness

### 25.7 Recommended definition

A concise definition of the MDE role in AI-MDE is:

> **MDE governs the analysis lifecycle: it supplies method and structure, watches tracked artifacts for change, tracks state and traceability, and orchestrates targeted AI re-evaluation to keep the BA baseline current.**

---


## 26. Change Management and Git-Based Tracking

Change management should be built into the BA stage from the start. In practice, some projects will use **formal change requests**, while others will evolve through **iterative clarification and process refinement**. AI-MDE should support both models without losing control, traceability, or auditability.

### 26.1 Two valid change modes

AI-MDE should support at least these two operating modes:

#### Formal change request mode
Used when the organization requires explicit approval and controlled scope updates.

Typical characteristics:
- change request identifier
- requester and approver
- reason for change
- impacted BA sections
- impact assessment
- approval decision
- effective date

#### Iterative refinement mode
Used when the team is still discovering the process and evolving the baseline through repeated clarification.

Typical characteristics:
- ongoing updates to questions, answers, assumptions, and rules
- lighter-weight change capture
- frequent baseline revisions
- rapid feedback cycles
- no heavy approval gate for every refinement

Both should still be tracked.

### 26.2 Git as the baseline change ledger

The BA workspace should be committed to Git and treated as a managed project artifact set.

Git should provide:
- version history of all BA documents and supporting files
- commit-based traceability of requirement evolution
- diff visibility for reviewers
- rollback to earlier states if needed
- branch-based experimentation or controlled reviews

This means AI-MDE should not only update files; it should update them in a way that is compatible with disciplined Git review.

### 26.3 What should be tracked in Git

At minimum, the following should be versioned:

- source inventory
- discovery findings
- clarification log
- assumption register
- conflict register
- requirement baseline
- business rules catalog
- entity and artifact catalog
- business analysis document
- traceability matrix
- change log
- question files and answered question files where retained

### 26.4 Change event handling

Whenever a meaningful change occurs, AI-MDE should capture:

- what changed
- why it changed
- what triggered the change
- which BA objects were affected
- whether the change was formal or iterative
- whether new questions were introduced
- whether design readiness was impacted

### 26.5 Recommended Git-aware workflow

A practical workflow would be:

1. AI-MDE updates BA artifacts after new evidence or answers.
2. AI-MDE summarizes the delta.
3. The user reviews the changed files.
4. Changes are committed to Git.
5. Commit message reflects the business meaning of the change.
6. The audit trail links the change to the relevant questions, answers, sources, and requirements.

### 26.6 Commit discipline

Commit messages should reflect business analysis intent, not just file edits.

Examples:
- `Clarify approval thresholds for finance vs manager routing`
- `Update reporting requirements after stakeholder answers`
- `Resolve open issue on record retention period`
- `Add formal change request CR-004 for escalation workflow revision`

This makes Git history useful as part of the audit trail.

### 26.7 Relationship between change management and MDE

This is another place where the MDE layer matters.

MDE should:
- classify the change type
- determine impacted objects
- trigger targeted AI re-evaluation
- update lifecycle states
- preserve links between the change and affected outputs
- help prepare a coherent Git-ready delta

### 26.8 Recommended principle

A concise principle for AI-MDE is:

> **Business analysis outputs are living engineering artifacts. They must support both formal change control and iterative refinement, with Git-based history used as a practical baseline for traceability and review.**

---

## 27. Next Steps

The next recommended deliverables for AI-MDE are:

1. **BA Methodology Note**
   A short formal document stating method, references, evidence hierarchy, and limitations.

2. **BA Output Schema**
   A machine-usable schema for findings, questions, answers, requirements, rules, and trace links.

3. **Audit Trail Schema**
   A dedicated model for question/answer/change traceability.

4. **BA Document Template**
   The standard markdown or JSON structure used across projects.

5. **Readiness Criteria**
   A formal checklist that determines when the BA baseline is mature enough for architecture.

---
## Methodology

AI-MDE supports predictive, iterative, and hybrid delivery models.
In predictive settings, it can operate with formal stage gates, baseline approvals, and change requests.
In iterative settings, it can continuously refine the BA baseline across short delivery cycles such as Scrum sprints.
In hybrid settings, it can maintain formal traceability and governance while supporting incremental elaboration and implementation.

## 27. Closing

This proposal defines a realistic and credible direction for AI-MDE.

The central idea is not to force users to behave like trained analysts. The central idea is to let AI-MDE do the heavy lifting of business analysis in a disciplined, transparent, and traceable way.

That is what makes the approach practical.
That is what makes it trustworthy.
And that is what makes it suitable as the foundation for later system architecture and design.


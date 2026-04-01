# AI-MDE Lifecycle

AI-MDE covers the full software lifecycle. Each phase is governed, traceable, and feeds into the next. Governance and Validation runs continuously across all phases.

---

## 1. Project Initiation

Before analysis begins, AI-MDE establishes the foundation:

- select methodology (Agile, waterfall, hybrid, or custom)
- select architecture pattern (layered, microservices, event-driven, etc.)
- configure the managed workspace and project state
- establish phase rules and governance constraints

---

## 2. Business Analysis

AI-MDE ingests raw project material and helps derive:

- goals and scope
- stakeholders and roles
- requirements
- business rules
- processes and workflows
- entities and artifacts
- assumptions, conflicts, and open questions

---

## 3. System Design

With the BA baseline established, AI-MDE derives the full system design:

- system architecture and module boundaries
- logical data model (LDM) and physical entities
- SQL schemas and data structures
- API contracts and integration points
- UI outline and navigation model
- workflow and orchestration models
- design constraints and architectural rules

---

## 4. Development

AI-MDE supports implementation by generating or guiding:

- module specs and service contracts
- schemas, interfaces, and DTOs
- implementation scaffolds and code templates
- UI source code
- sample data
- generated code in selected areas

---

## 5. Deployment

AI-MDE supports the release and operational phase:

- release packaging and environment configuration
- deployment verification and smoke testing
- monitoring and operational runbooks
- rollback guidance and incident traceability

---

## 6. Governance and Validation — continuous

Runs throughout every phase, not just at the end:

- validate requirements completeness and traceability
- validate architecture and design compliance
- assess methodology alignment
- generate diagrams (state, workflow, module interaction, BPMN, data flow)
- export and publish documentation
- run end-to-end traceability checks
- assess change impact and re-evaluate affected areas

---

## 7. Change Management

AI-MDE treats change as a first-class lifecycle concern with a governed workflow:

- evaluate change requests against the current baseline
- identify impacted requirements, designs, code, and tests
- refine business requirements and elaborate system design for the change
- validate design compliance and traceability after the change
- regenerate only affected documentation, diagrams, and outputs
- maintain a full audit trail per change request

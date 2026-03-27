# Business Analysis from Source Documents

| Field | Value |
|-------|-------|
| `name` | `business_analysis_from_sources` |
| `category` | business_analysis |

---

## Purpose

Analyze mixed project inputs, derive a clean requirements baseline, maintain a separate analysis status record for sources, history, and open issues, and generate targeted clarification questions with prefilled default answers the user can keep, edit, or delete.

## When to Use

- Project starts from raw notes, docs, spreadsheets, screenshots, forms, reports, emails, or process descriptions
- Requirements are incomplete or unclear
- The user cannot articulate a formal requirements document
- The system needs to guide discovery before architecture or design

## Input Types

| Input                               | Details                                                                                                                                                      |
|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `source-documents`                  | **required**, multiple — Primary business source materials such as markdown docs, notes, spreadsheets, screenshots, forms, reports, SOPs, and sample outputs |
| `application-definition`            | **required** — Structured application definition covering the app, business domain, subjects, scope, and current release intent                              |
| `existing-ba-artifacts`             | optional, multiple — Previously generated BA outputs that should be updated rather than recreated                                                            |
| `requirements-json`                 | optional — Existing normalized requirements baseline, if available                                                                                           |
| `business-functions`                | optional — Known business capability/function list, if available                                                                                             |
| `open-issues-json`                  | optional — Current unresolved issues or deferred questions                                                                                                   |
| `clarification-queue-json`          | optional — Pending or previously unanswered clarification items                                                                                              |
| `clarification-question-batch-json` | optional — Question batch file containing user responses that must be examined and incorporated into updated BA outputs on subsequent runs                   |
| `completed-questions-json`          | optional — Archive of satisfactorily answered questions that were accepted into the BA baseline in prior runs                                                |

### Required

- source-documents

### Optional

- requirements.json
- use-cases.md
- business-functions.json
- open-issues.json
- clarification-queue.json
- questions.json

## Outputs

| Output                                      | Format   |
|---------------------------------------------|----------|
| `source_inventory`                          | —        |
| `discovery_findings`                        | —        |
| `terminology_map`                           | —        |
| `clarification_question_batch`              | json     |
| `clarification_queue_updates`               | json     |
| `completed_questions_archive_updates`       | json     |
| `assumptions_register`                      | —        |
| `conflict_register`                         | —        |
| `requirements_baseline_updates`             | json     |
| `business_rules_catalog_updates`            | json     |
| `entity_artifact_catalog_updates`           | —        |
| `business_analysis_document_updates`        | markdown |
| `business_analysis_status_document_updates` | markdown |
| `design_readiness_summary`                  | json     |

## Objectives

- Extract business goals, actors, workflows, rules, artifacts, entities, constraints, pain points, integrations, and ambiguities
- Normalize terminology across inconsistent source material
- Separate explicit facts from inference, assumptions, and unresolved issues
- Examine user responses captured in ../../project/questions.json and use accepted answers to update BA outputs before generating new questions
- Archive only satisfactorily answered question items in ../../project/completed-Questions.json so active questions.json contains only still-open or not-yet-accepted clarification work
- Generate the next highest-value clarification questions
- Prefill the response field with the best default answer or answer set when confidence is sufficient
- Allow unresolved items to remain in queue rather than forcing guesses
- Produce a design-ready BA baseline incrementally
- Keep requirements.md focused on baseline requirements while recording source inventory, clarification history, blockers, and readiness in a separate status artifact

## Methodology

- Follow the discovery_loop workflow pattern defined in methodology.json
- Use source artifacts as the primary evidence base
- Do not assume the user can provide a formal requirements document
- Start with discovery, not architecture
- Extract what is explicit first
- Label each significant item as explicit, inferred, assumed, conflicting, or unresolved
- Ask only the next highest-value questions, not an exhaustive questionnaire
- For each question, explain why it matters and what gap it resolves
- When possible, prefill the response field with the best default answer or answer set to reduce user effort
- Allow the user to keep, edit, partially delete, fully clear, or defer the prefilled response
- Track unresolved items in a queue instead of inventing certainty
- Preserve traceability between sources, findings, questions, answers, requirements, and BA sections
- Keep the requirements document focused on requirements content and store source inventory, history, blockers, and status in a separate BA status document
- Do not move to architecture recommendations unless BA readiness is sufficient

## Constraints

- Do not jump directly to architecture or implementation
- Do not fabricate requirements that are not supported by evidence or clarified by the user
- Do not overwhelm the user with broad questionnaires
- Do not hide uncertainty
- Do not ignore populated responses in questions.json on subsequent runs
- Do not emit a separate suggested_answers field in questions.json; use response as the default answer payload
- Do not move questions to completed-Questions.json unless accepted is true
- Do not set accepted to true — only the user sets accepted
- Do not keep questions with accepted: true in active questions.json; move them to completed-Questions.json
- Do not discard unanswered questions; queue them

## Question Strategy

- Batch size: 3–7 (default 5)

### Prioritization

- Architecture impact
- Business criticality
- Uncertainty level
- Dependency on other answers
- Ability to reduce multiple downstream ambiguities

### Categories

- business_problem
- scope
- stakeholders_roles
- workflow_process
- business_rules
- data_artifacts
- integrations
- reporting_outputs
- non_functional_constraints
- open_issues

### Answer Modes

- single_select_or_edit
- multi_select_or_edit
- free_text
- defer_to_queue

## Default Response Policy

- Enabled: true
- Minimum confidence: medium
- Max prefilled items: 6

### Rules

- Do not present prefilled responses as facts
- Use the response field itself for defaults rather than a separate suggested_answers field
- Prefer domain-neutral patterns unless project evidence suggests otherwise
- Allow the user to edit, trim, replace, or clear the prefilled response

## Gap Detection


### Coverage Areas

- business_problem_and_goals
- scope_and_out_of_scope
- stakeholders_and_roles
- business_capabilities_and_functions
- use_cases_and_user_stories
- current_state_process
- pain_points_and_gaps
- target_capabilities
- business_rules_and_decision_logic
- functional_requirements
- non_functional_requirements
- data_and_business_entities
- inputs_outputs_and_artifacts
- external_integrations
- risks_assumptions_dependencies
- open_questions

### Handlers

- Missing required context → `generate_clarification_questions`
- Conflict → `record_conflict_and_ask_for_resolution`
- Partial information → `continue_with_labeled_assumptions`

## Traceability Rules

- Every major finding should reference one or more source artifacts when available
- Every clarification question should identify the gap it is resolving
- Every accepted answer should update one or more BA objects explicitly
- Every unresolved issue should remain visible in the queue or open issues register
- Questions accepted as complete should be preserved in ../../project/completed-Questions.json rather than disappearing from traceability
- When a document is moved to analyzed, preserve enough path metadata to trace findings back to the original source file
- Do not silently overwrite prior assumptions without recording the change

## Completion Criteria

- Business problem is clear enough for structured analysis
- Main actors and workflow are identified
- Key artifacts and entities are known
- Major business rules are captured or explicitly queued
- Core functional and non-functional requirements are at least draftable
- Major ambiguities are either resolved or visible in queue
- BA baseline is stable enough to support architecture

## Failure Behavior

| Condition                 | Action                                                        |
|---------------------------|---------------------------------------------------------------|
| `on_insufficient_sources` | `ask_for_more_source_material_or_application_definition`      |
| `on_heavy_conflict`       | `produce_conflict_register_and_targeted_resolution_questions` |
| `on_missing_answers`      | `continue_with_queue_and_labeled_assumptions`                 |
| `on_low_confidence`       | `avoid overcommitting_and_raise_clarification`                |

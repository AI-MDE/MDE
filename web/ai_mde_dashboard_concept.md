# AI-MDE User Dashboard Concept

## Goal
Give a user one place to see:
- where the project is in the lifecycle
- what is already complete
- what is blocked or at risk
- what the next best action is
- how to drill into details without losing the big picture

## Recommended Dashboard Structure

### 1. Header strip
Top-level project context:
- Project name
- Current phase
- Overall progress
- Last model/run activity
- Current branch / environment
- Main status: On Track / At Risk / Blocked

### 2. Lifecycle phase rail
A horizontal phase tracker with clickable phases:
1. Discover
2. Model
3. Design
4. Generate
5. Implement
6. Validate
7. Deploy
8. Operate

Each phase should show:
- status icon
- percent complete
- owner
- last updated
- blockers count

### 3. “What is done / What is next / What needs attention” panel
This should be the center of the screen.

Three columns:
- **Done**: recent completed milestones, generated artifacts, approved decisions
- **Next**: the next 3-5 recommended actions
- **Attention**: blockers, missing inputs, failed validations, unresolved reviews

This is the most useful section for day-to-day operation.

### 4. Recommended next action card
One prominent card:
- “Best next action”
- why this action is next
- expected outcome
- required inputs
- CTA button: Open details / Run / Assign / Approve

This is what makes AI-MDE feel guided instead of just informative.

### 5. Work items and artifacts panel
Show deliverables by phase:
- models
- commands executed
- generated code
- documents
- validations
- approvals

Useful fields:
- artifact name
- type
- phase
- status
- source command
- last changed
- owner

### 6. Activity / decision timeline
A right-side panel or lower section with:
- model updates
- command executions
- review decisions
- manual overrides
- failures and retries

This gives traceability and trust.

### 7. Drill-down details drawer
When the user clicks a phase, task, or artifact, open a side drawer with:
- summary
- detailed checklist
- generated outputs
- issues / warnings
- links to related artifacts
- suggested actions
- audit trail

## Best Layout Recommendation

### Main layout
- **Top row:** project summary cards
- **Second row:** horizontal lifecycle phase tracker
- **Main body left (70%):** done / next / attention + recommended next action + artifact list
- **Main body right (30%):** timeline, blockers, health metrics
- **Details:** slide-out drawer from the right

This gives strong executive visibility while preserving deep technical access.

## Core Widgets

### Summary cards
- Overall completion
- Current phase
- Open blockers
- Pending approvals
- Generated artifacts
- Validation score

### Phase card contents
Each phase card can include:
- status: not started / in progress / done / blocked
- checklist progress
- count of related tasks
- count of related artifacts
- one-line summary

### Drill-down tabs
For each phase detail view:
- Overview
- Tasks
- Artifacts
- Decisions
- Issues
- History

## Status Model
Use a simple consistent status system:
- Not Started
- In Progress
- Waiting
- Blocked
- Completed
- Needs Review

Avoid too many status types.

## Recommended User Flow

### On opening the dashboard
The user should immediately know:
1. where they are
2. whether anything is wrong
3. what to do next

### On clicking current phase
The user sees:
- phase summary
- checklist
- missing prerequisites
- outputs produced
- next transitions

### On clicking a blocker
The user sees:
- root cause
- affected phases/artifacts
- recommended fix
- owner
- escalation path

## Suggested Data Model Behind the UI

### Project
- id
- name
- description
- currentPhase
- overallStatus
- progressPercent

### Phase
- id
- name
- order
- status
- progressPercent
- startedAt
- completedAt
- blockers[]
- tasks[]
- artifacts[]

### Task
- id
- title
- status
- priority
- owner
- dueDate
- relatedPhase
- recommendedNext

### Artifact
- id
- name
- type
- status
- phase
- path/url
- generatedBy
- lastUpdated

### Event
- id
- type
- timestamp
- actor
- summary
- relatedEntity

## Design Direction

### Visual style
For AI-MDE, I recommend:
- clean enterprise look
- dark text on light background for readability
- one accent color for progress and action
- muted secondary colors for completed/waiting states
- minimal clutter
- cards with clear hierarchy

### Why this style fits AI-MDE
AI-MDE is about controlled orchestration, traceability, and progression. The UI should feel:
- structured
- explainable
- guided
- operational

Not playful. Not overly analytics-heavy. More “mission control” than “marketing dashboard.”

## Best First Version
For v1, build only these:
1. Header summary cards
2. Phase tracker
3. Done / Next / Attention
4. Recommended next action card
5. Drill-down drawer
6. Activity timeline

That is enough to make the product immediately useful.

## Recommended Default Phases for AI-MDE
1. Intake
2. Analyze
3. Model
4. Generate
5. Review
6. Validate
7. Release
8. Monitor

These labels are slightly more user-friendly than purely technical labels.

## My recommendation
If you want a strong practical version, use this exact framing:
- **Top:** project + current state
- **Middle:** phase journey
- **Center:** done / next / attention
- **Right:** activity + blockers
- **Drill-down:** full detail drawer

That gives executives clarity, engineers actionability, and traceability for AI-driven work.

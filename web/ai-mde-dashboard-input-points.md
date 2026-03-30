# AI-MDE Dashboard Input Points

This script expects **up to 7 JSON inputs**. You can use all of them, or start with only a few.

## 1) `project.json`
Top-level project summary.

Example:
```json
{
  "project": {
    "id": "ai-mde-001",
    "name": "Customer Onboarding Flow",
    "status": "On Track",
    "currentPhase": "Generate",
    "owner": "Ralph",
    "startedAt": "2026-03-01T10:00:00Z",
    "targetDate": "2026-04-15T00:00:00Z",
    "percentComplete": 58,
    "summary": "Model-driven delivery of onboarding workflow",
    "pendingApprovals": 2,
    "blockers": 1
  }
}
```

Supported aliases:
- `projectName`, `phase`, `releaseDate`, `dueDate`, `progress`

---

## 2) `phases.json`
Phase definitions and optional progress.

Example:
```json
{
  "phases": [
    {
      "id": "p1",
      "name": "Intake",
      "order": 1,
      "status": "completed",
      "percentComplete": 100,
      "owner": "Analyst"
    },
    {
      "id": "p4",
      "name": "Generate",
      "order": 4,
      "status": "in_progress",
      "percentComplete": 65,
      "nextAction": "Review generated service classes"
    }
  ]
}
```

Supported aliases:
- `phase`, `progress`, `tasks`, `completedTasks`, `artifacts`, `blockers`

---

## 3) `tasks.json`
Work items used for **Done / Next / Attention** and for phase progress.

Example:
```json
{
  "tasks": [
    {
      "id": "t1",
      "title": "Generate REST endpoints",
      "phase": "Generate",
      "status": "in_progress",
      "priority": "high",
      "owner": "Dev A",
      "dueDate": "2026-03-31T00:00:00Z",
      "blocked": false,
      "recommendation": "Complete controller output before UI binding"
    },
    {
      "id": "t2",
      "title": "Resolve mapping mismatch",
      "phase": "Generate",
      "status": "blocked",
      "priority": "critical",
      "blocked": true
    }
  ]
}
```

Preferred `status` values:
- `todo`
- `ready`
- `next`
- `in_progress`
- `done`
- `completed`
- `blocked`
- `at_risk`

Preferred `priority` values:
- `low`
- `medium`
- `high`
- `critical`

---

## 4) `artifacts.json`
Generated outputs, documents, models, code files, validations.

Example:
```json
{
  "artifacts": [
    {
      "id": "a1",
      "name": "domain-model.json",
      "type": "model",
      "phase": "Model",
      "status": "approved",
      "updatedAt": "2026-03-29T18:00:00Z",
      "link": "/files/domain-model.json"
    }
  ]
}
```

Supported aliases:
- `title`, `kind`, `url`, `modifiedAt`, `outputs`

---

## 5) `blockers.json`
Open issues that stop or slow work.

Example:
```json
{
  "blockers": [
    {
      "id": "b1",
      "title": "Generator missing DTO mapping",
      "severity": "high",
      "phase": "Generate",
      "status": "open",
      "owner": "Platform Team",
      "createdAt": "2026-03-28T12:00:00Z"
    }
  ]
}
```

Preferred `severity` values:
- `low`
- `medium`
- `high`
- `critical`

---

## 6) `activity.json`
Timeline events for recent activity.

Example:
```json
{
  "activity": [
    {
      "id": "e1",
      "type": "artifact_updated",
      "title": "Updated generation template",
      "actor": "Ralph",
      "phase": "Generate",
      "at": "2026-03-30T13:00:00Z"
    }
  ]
}
```

Supported aliases:
- `events`, `timeline`, `timestamp`, `message`

---

## 7) `decisions.json`
Approvals and decisions waiting for action.

Example:
```json
{
  "decisions": [
    {
      "id": "d1",
      "title": "Approve generated API contract",
      "phase": "Review",
      "status": "pending",
      "owner": "Architect",
      "dueDate": "2026-04-01T00:00:00Z"
    }
  ]
}
```

Preferred `status` values:
- `pending`
- `approved`
- `rejected`
- `deferred`

---

# Minimal setup
If you want to start small, these 3 files are enough:
- `project.json`
- `phases.json`
- `tasks.json`

That already gives you:
- top summary
- phase journey
- done / next / attention
- recommended next action

# Express wiring example
```js
const express = require('express');
const { createDashboardRouter } = require('./ai-mde-dashboard-data');

const app = express();

app.use('/api/dashboard', createDashboardRouter({
  config: {
    project: './data/project.json',
    phases: './data/phases.json',
    tasks: './data/tasks.json',
    artifacts: './data/artifacts.json',
    blockers: './data/blockers.json',
    activity: './data/activity.json',
    decisions: './data/decisions.json'
  }
}));

app.listen(3000, () => {
  console.log('Dashboard API listening on http://localhost:3000');
});
```

# Output shape
The route returns a single composed JSON object with:
- `summary`
- `phases`
- `work.done`
- `work.next`
- `work.attention`
- `nextAction`
- `artifacts`
- `blockers`
- `decisions`
- `traceability`

# Best next step
Send me your real JSON filenames and a sample shape for each one, and I can adapt this script so it matches your exact schema instead of using the flexible adapter logic.

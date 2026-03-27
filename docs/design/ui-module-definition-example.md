# UI Module Definition

## Purpose

This document defines what a **UI Module** is, how it differs from a page or a component, and provides a complete example that can be used as a template for future module specifications.

---

# 1. UI terminology

## UI Domain Area

A **UI Domain Area** is a large user-facing section of the application.

Examples:
- Claimant Portal
- Claims Operations
- Decisioning
- Settlement
- Admin

A UI Domain Area usually contains multiple UI Modules.

---

## UI Module

A **UI Module** is a bounded front-end capability area organized around a coherent **user goal** or **work area**.

A UI Module may contain:

- one or more pages
- feature-specific components
- local state
- permission/visibility rules
- backend interactions
- view models
- navigation entry points

A UI Module is **not** defined by:

- a database table
- a backend entity
- a repository
- a DTO
- a single API endpoint

A UI Module is usually defined by:

- actor
- user goal
- work context
- navigation boundary
- permission boundary
- task cohesion

### Short definition

> A UI Module is a bounded user-facing capability area that supports one coherent work goal and may contain multiple pages, components, state, permissions, and backend dependencies.

---

## Page

A **Page** is a route-level screen inside a UI Module.

A page is a specific visual screen or route context.

Examples:
- `ClaimSearchPage`
- `ClaimDetailsPage`
- `ClaimDecisionPage`

A Page is usually narrower than a UI Module.

---

## Component

A **Component** is a reusable or feature-specific UI building block used inside a page or module.

Examples:
- `ClaimSummaryCard`
- `DecisionForm`
- `StatusBadge`
- `AssignAgentPanel`

---

## Recommended hierarchy

```text
UI Domain Area
  -> UI Module
      -> Page
          -> Component
```

---

# 2. Is a page a module?

Usually, **no**.

A page is normally one screen inside a module.

A module is usually larger than a page and groups together:

- related screens
- related actions
- shared state
- shared backend interactions
- shared permission rules

## Exception

In a very small feature, a module may currently have only one page.

Even then, it is still better to think of:

- module = capability
- page = screen

That keeps the design scalable.

---

# 3. How to define a UI Module

A UI Module should be defined by:

- **who uses it**
- **what goal it supports**
- **which Business Use Case Items it includes**
- **which screens/pages it owns**
- **which components it uses**
- **which backend capabilities it depends on**
- **which permissions affect it**
- **which state it manages**
- **which assumptions are being made**

---

# 4. Complete UI Module definition example

Below is a full example for a module called **Claim Decisioning**.

---

## UI Module Spec: Claim Decisioning

### Identity

- **Module Name**: Claim Decisioning
- **Module Key**: `claim-decisioning`
- **UI Domain Area**: Decisioning
- **Status**: Draft

---

### Purpose

- **Primary User Goal**: allow authorized internal users to review a claim and make a decision
- **Description**: this module supports the decision stage of claim handling, where a claim can be approved or denied after review

---

### Actors

- **Primary Actors**:
  - supervisor
  - adjuster

- **Secondary Actors**:
  - claim agent (view-only in some cases)

- **Excluded Actors**:
  - claimant portal user
  - finance admin

---

### Included Business Use Case Items

- View Claim
- Approve Claim
- Deny Claim

### Optional Related Items

- View Claimant
- View Claim History
- View Review Notes

### Out of Scope Items

- Submit Claim
- Assign Claim
- Mark Paid
- Close Claim
- Admin rule maintenance

---

### Owned Pages

- `ClaimDecisionPage`
- `ClaimDecisionResultPage` (optional)
- `ClaimDecisionHistoryPage` (optional)

### Entry Page

- `ClaimDecisionPage`

### Candidate Dialogs / Panels

- `ApproveClaimPanel`
- `DenyClaimPanel`
- `SupervisorApprovalWarningPanel`
- `ClaimSummarySidePanel`

---

### Main Components

#### Feature-specific components
- `DecisionSummaryCard`
- `ApproveClaimForm`
- `DenyClaimForm`
- `ClaimDecisionToolbar`
- `SupervisorApprovalNotice`

#### Shared components used
- `StatusBadge`
- `MoneyDisplay`
- `DateDisplay`
- `PageHeader`
- `ConfirmDialog`
- `ErrorBanner`

---

### Navigation

- **Navigation Area**: Decisioning
- **Primary Routes**:
  - `/decision/claims/:id`
  - `/decision/claims/:id/history`

- **Entry Points**:
  - claim review queue
  - supervisor decision queue
  - direct link from claim workbench

- **Related Modules**:
  - `claim-workbench`
  - `claim-search`

---

### Permissions / Visibility

- **View Permission**:
  - `claim.view`
  - `claim.decision.view`

- **Action Permissions**:
  - `claim.approve`
  - `claim.deny`

- **Conditional Visibility Rules**:
  - approval controls shown only when claim status allows approval
  - denial controls shown only when claim status allows denial
  - supervisor approval notice shown when claim requires supervisor approval
  - users without decision permission see read-only mode

---

### Backend Dependencies

#### Queries
- `GetClaim`
- `GetClaimant` (optional)
- `GetClaimHistory` (optional)

#### Commands
- `ApproveClaim`
- `DenyClaim`

#### Events observed indirectly
- `ClaimApproved`
- `ClaimDenied`

#### APIs / endpoints
- `GET /claims/:id`
- `POST /claims/:id/approve`
- `POST /claims/:id/deny`

---

### View Model

- **Primary View Model**: `ClaimDecisionVm`

#### Key displayed fields
- claim number
- claim status
- claim amount
- approved amount
- claimant name
- incident date
- assigned agent
- supervisor approval required flag

#### Editable fields
- approved amount (approval path)
- denial note / reason if supported
- decision comment if supported

#### Derived fields
- canApprove
- canDeny
- requiresSupervisorApproval
- isReadOnly

---

### State Management

#### Local UI state
- selected decision action
- confirmation dialog open/closed
- active tab
- form dirty state

#### Server state
- current claim
- optional claim history
- action mutation status

#### Concurrency state
- current `versionNo`
- stale-data warning after mutation conflict

---

### UX Behavior

- open the page and load claim summary first
- show available actions based on permissions and claim status
- when user chooses approve:
  - validate input
  - confirm action
  - submit command
  - refresh claim details
  - show success feedback
- when user chooses deny:
  - validate input
  - confirm action
  - submit command
  - refresh claim details
  - show success feedback

#### Success behavior
- show toast/banner
- refresh claim summary
- optionally navigate to result/history state

#### Error behavior
- show business-rule error from backend
- show concurrency conflict and offer refresh
- show generic failure fallback

#### Loading behavior
- skeleton or loading panel while fetching claim
- disable action buttons during mutation

#### Empty / invalid state
- not found state if claim does not exist
- unauthorized state if actor lacks permission

---

### Validation

#### Client-side validation
- approved amount required when approving
- approved amount must be numeric
- denial comment/reason required only if policy requires it

#### Expected server-side enforcement
- only allowed statuses can be approved or denied
- approved amount cannot exceed claim amount
- supervisor role required where applicable
- stale version rejected by concurrency checks

---

### Assumptions

- claim approval and denial are part of one user work area
- supervisors and adjusters share enough common screen behavior to remain in one module
- claim history is read-only and does not require a separate module initially
- a single claim decision page is enough for first implementation

---

### Open Questions

- should approval and denial be separate pages or one combined decision page?
- does denial require a reason in the business model?
- should claim history remain inside this module or move to a shared claim details module?
- do supervisors need extra controls beyond approve/deny?

---

### Notes

- this module is defined by the **decisioning work boundary**, not by the `claim` table alone
- it uses claim backend capabilities, but it is a user-facing module, not a mirror of backend package structure

---

# 5. Minimal reusable UI Module template

```yaml
name:
key:
area:
status:

purpose:
primary_user_goal:
description:

actors:
  primary: []
  secondary: []
  excluded: []

included_use_case_items: []
optional_related_items: []
out_of_scope_items: []

pages: []
routes: []
entry_points: []

permissions:
  view: []
  actions: []
  conditional_visibility: []

backend_dependencies:
  queries: []
  commands: []
  events: []
  apis: []

main_components: []
shared_components: []

view_model:
  primary:
  key_fields: []
  editable_fields: []
  derived_fields: []

state:
  local: []
  server: []
  concurrency: []

ux_behavior:
  main_flow:
  success_behavior:
  error_behavior:
  loading_behavior:
  empty_state:

validation:
  client_side: []
  expected_server_rules: []

assumptions: []
open_questions: []
notes: []
```

---

# 6. Final takeaway

A UI Module is:

- larger than a page
- centered on a user-facing capability
- defined by user work, not backend tables
- allowed to contain multiple pages, components, permissions, and backend interactions

A page is just one screen inside that module.

That distinction is essential for generating good UI architecture.

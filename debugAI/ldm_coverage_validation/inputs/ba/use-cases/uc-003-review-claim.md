# UC-003: Review Claim

## Description
Claims agent performs detailed review of a claim and supporting documents.

## Actors
- Claims Agent

## Preconditions
- Claim status is `Assigned`.
- Claim is visible in the assigned agent work queue.

## Main Flow
1. Agent opens assigned claim.
2. Agent reviews claim details and attached documents.
3. Agent records review notes.
4. Agent moves claim status to `Under Review`.

## Alternate Flows
- Required information is unclear or incomplete: agent requests additional information (UC-004).
- Fraud indicators identified: claim is routed to fraud review (UC-005).

## Postconditions
- Claim status is updated to reflect review progress.
- Review notes are stored for auditability.

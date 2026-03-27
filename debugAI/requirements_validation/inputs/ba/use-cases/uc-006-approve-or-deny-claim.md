# UC-006: Approve Or Deny Claim

## Description
Claims agent (and supervisor when required) makes claim decision.

## Actors
- Claims Agent
- Supervisor

## Preconditions
- Claim has completed required review steps.
- Required evidence and documents are present.

## Main Flow
1. Agent evaluates claim against business rules.
2. For claims over threshold (> 10,000 USD), system requests supervisor approval.
3. Supervisor approves or rejects escalation request.
4. Agent records final decision.
5. System updates claim status to `Approved` or `Denied`.

## Alternate Flows
- Supervisor rejects approval: claim is denied or returned for further review.

## Postconditions
- Decision is captured with audit trail.
- Claim status reflects final decision outcome.

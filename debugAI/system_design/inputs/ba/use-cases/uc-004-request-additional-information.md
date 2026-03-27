# UC-004: Request Additional Information

## Description
Claims agent requests additional information from claimant when submission is incomplete or unclear.

## Actors
- Claims Agent
- Claimant

## Preconditions
- Claim is in `Under Review`.
- Agent identifies missing or ambiguous information.

## Main Flow
1. Agent records missing information items.
2. System sends information request to claimant.
3. Claim status changes to `Pending Information`.
4. Claimant submits requested information.
5. System attaches new information to claim.
6. Claim returns to `Under Review`.

## Alternate Flows
- Claimant does not respond within SLA: system escalates per policy.

## Postconditions
- Additional information is linked to claim.
- Review can continue with updated claim package.

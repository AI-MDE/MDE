# UC-005: Perform Fraud Review

## Description
Claim enters additional fraud-focused review when fraud indicators are detected.

## Actors
- Claims Agent
- Fraud Reviewer (or designated reviewer)

## Preconditions
- Fraud indicators are identified during review.

## Main Flow
1. Agent flags claim for fraud review.
2. System updates status to `Fraud Review`.
3. Reviewer evaluates fraud indicators and evidence.
4. Reviewer records recommendation to continue, deny, or escalate.
5. Claim returns to standard decision flow.

## Alternate Flows
- High-risk finding: escalation to supervisor before decision.

## Postconditions
- Fraud review decision record is stored.
- Claim is routed to decisioning path.

# UC-007: Calculate And Execute Payout

## Description
System calculates payout for approved claims and completes payout processing.

## Actors
- Claims Agent
- System

## Preconditions
- Claim status is `Approved`.
- Payout inputs are available.

## Main Flow
1. Agent confirms payout-relevant values.
2. System calculates payout amount.
3. Agent validates calculation result.
4. System records payout transaction.
5. Claim status changes to `Paid` and then `Closed` when completion criteria are met.

## Alternate Flows
- Calculation exception: claim returns to `Under Review` for correction.

## Postconditions
- Payout is recorded.
- Claim lifecycle progresses to closure.

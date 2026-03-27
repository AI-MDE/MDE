# UC-002: Assign Claim To Agent

## Description
System assigns a submitted claim to a claims agent for processing.

## Actors
- System
- Claims Agent

## Preconditions
- Claim status is `Submitted`.
- At least one eligible claims agent is available.

## Main Flow
1. Assignment process identifies eligible agents.
2. System selects an agent using assignment policy.
3. System assigns claim to selected agent.
4. System updates claim status to `Assigned`.
5. System notifies assigned agent.

## Alternate Flows
- No eligible agent available: claim remains in assignment queue.

## Postconditions
- Claim has an assigned owner.
- Claim status is `Assigned`.

# UC-001: Submit Claim

## Description
Claimant submits a new insurance claim with required claim form details and supporting documents.

## Actors
- Claimant

## Preconditions
- Claimant is authenticated or identified per intake channel.
- Claim type is selected.

## Main Flow
1. Claimant starts claim submission.
2. System captures required claim form fields.
3. Claimant uploads mandatory documents for the selected claim type.
4. System validates completeness and basic field constraints.
5. System creates claim with status `Submitted`.

## Alternate Flows
- Missing required fields: system prompts claimant to complete required data.
- Missing mandatory documents: system blocks submission until all mandatory documents are provided.

## Postconditions
- Claim exists in system.
- Claim status is `Submitted`.

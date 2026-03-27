# UC-008: Send Claim Notifications

## Description
System sends participant notifications at key workflow events.

## Actors
- System
- Claimant
- Claims Agent

## Preconditions
- Claim event that requires notification occurs.

## Main Flow
1. System detects notification-triggering event.
2. System prepares message from event context.
3. System sends notification to intended recipients.
4. System records notification delivery status.

## Alternate Flows
- Delivery failure: system retries and logs failure for follow-up.

## Postconditions
- Notification history is available for audit and operations.

# Responsibility Allocation Rules

This document defines where key concerns must be implemented in the system architecture.

## 1. Business Rules
- Implement in domain/business layer or rule modules.
- Must NOT be in controllers or persistence.

## 2. Validation
### Input Validation
- Controller/API boundary (DTO validation)

### Business Validation
- Domain/service layer

### Persistence Validation
- Database constraints

## 3. Security / ACL
- Authentication: controller/gateway
- Authorization: service layer
- Must NOT rely on UI-only enforcement

## 4. Workflow
- Orchestration: workflow engine (BPMN)
- Business actions: service layer
- Decision logic: rule modules

## 5. Data Ownership
- Each entity has one owning module
- Only owner writes, others read via interface

## 6. Persistence
- Repository/data access layer
- Must NOT contain business logic

## 7. Transactions
- Owned by service layer
- Controllers must not manage transactions

## 8. Concurrency
- Optimistic locking for mutable aggregates
- Version column enforcement

## 9. Integration
- Through adapters only
- No direct external calls from domain

## 10. API / DTO
- DTOs required at boundaries
- No direct entity exposure

## 11. Error Handling
- Business errors: domain/service
- Technical errors: infrastructure
- No raw exception leakage

## 12. Audit & Logging
- Audit: business events (immutable)
- Logging: diagnostics
- Master entities that represent business state must record lifecycle attribution (`createdAt`, `createdByUserId`, `updatedAt`, `updatedByUserId`).
- Decision actor attribution (approve/reject/cancel) belongs in immutable audit/history entries, not as decision-specific columns on master entities.

## 13. Notifications
- Via notification module
- Must not affect core workflow state

## 14. Reporting
- Read-only modules
- No writes from reporting layer

## 15. Configuration
- System config vs business policy separated

## Summary Rule
Every concern must define:
1. Where it lives
2. Who owns it
3. Who can call it
4. Where it must NOT live

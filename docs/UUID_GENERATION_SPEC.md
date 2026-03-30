# UUID Generation Specification

## Overview

All ID fields in sample data must use **RFC 4122 v4 UUIDs**, not placeholder or sequential formats.

## Format Requirements

### Valid UUID Format
```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx

Examples:
- 550e8400-e29b-41d4-a716-446655440001
- 660e8400-e29b-41d4-a716-446655440002
- 880e8400-e29b-41d4-a716-446655440007
```

### Invalid Formats (DO NOT USE)
```
❌ emp-00000001-0000-0000-0000-000000000001  (placeholder with entity prefix)
❌ lt-00000001-0000-0000-0000-000000000001   (placeholder with entity prefix)
❌ lr-00000001-0000-0000-0000-000000000001   (placeholder with entity prefix)
❌ 1, 2, 3, 4...                            (sequential integers)
❌ auto-generated                            (non-UUID text)
```

## Deterministic UUID Generation Strategy

When generating sample data, use a **deterministic seed approach** to ensure UUIDs are reproducible:

### Entity Type Prefixes (Deterministic First Octet)

Map each entity type to a unique UUID prefix:

| Entity Type | First Octet | Example UUIDs |
|---|---|---|
| employees | 550e8400 | 550e8400-e29b-41d4-a716-446655440001 |
| leave_types | 660e8400 | 660e8400-e29b-41d4-a716-446655440001 |
| leave_balances | 770e8400 | 770e8400-e29b-41d4-a716-446655440001 |
| leave_requests | 880e8400 | 880e8400-e29b-41d4-a716-446655440001 |
| leave_audit_entries | 990e8400 | 990e8400-e29b-41d4-a716-446655440001 |
| notifications | aa0e8400 | aa0e8400-e29b-41d4-a716-446655440001 |

### Sequence Pattern

For each entity instance, increment the last octets:

```
Entity: employees
Records: 5

Employee 1: 550e8400-e29b-41d4-a716-446655440001
Employee 2: 550e8400-e29b-41d4-a716-446655440002
Employee 3: 550e8400-e29b-41d4-a716-446655440003
Employee 4: 550e8400-e29b-41d4-a716-446655440004
Employee 5: 550e8400-e29b-41d4-a716-446655440005
```

## Implementation in Code

### Node.js (using uuid package)

```javascript
const { v4: uuidv4 } = require('uuid');

// Generate random v4 UUIDs
const randomId = uuidv4();  // e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// For deterministic UUIDs, use namespace (v3) or custom seeding
function generateDeterministicUUID(entityType, sequence) {
  // Map entity type to prefix
  const prefixes = {
    'employees': '550e8400',
    'leave_types': '660e8400',
    'leave_balances': '770e8400',
    'leave_requests': '880e8400',
    'leave_audit_entries': '990e8400',
    'notifications': 'aa0e8400'
  };
  
  const prefix = prefixes[entityType];
  const paddedSequence = String(sequence).padStart(10, '0');
  
  return `${prefix}-e29b-41d4-a716-${paddedSequence}`;
}

// Usage
const emp1 = generateDeterministicUUID('employees', 1);
// Result: "550e8400-e29b-41d4-a716-0000000001"
```

### Python (Alternative)

```python
import uuid

# Random v4 UUID
random_id = str(uuid.uuid4())  # e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479"

# Deterministic UUID generation
def generate_deterministic_uuid(entity_type: str, sequence: int) -> str:
    prefixes = {
        'employees': '550e8400',
        'leave_types': '660e8400',
        'leave_balances': '770e8400',
        'leave_requests': '880e8400',
        'leave_audit_entries': '990e8400',
        'notifications': 'aa0e8400'
    }
    
    prefix = prefixes[entity_type]
    padded_seq = str(sequence).zfill(10)
    return f"{prefix}-e29b-41d4-a716-{padded_seq}"

# Usage
emp1 = generate_deterministic_uuid('employees', 1)
# Result: "550e8400-e29b-41d4-a716-0000000001"
```

## Referential Integrity Rules

When one entity references another:

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440001",
  "employee_id": "550e8400-e29b-41d4-a716-446655440003",
  "leave_type_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

**CRITICAL**: The referenced IDs MUST match exactly the IDs in the referenced entity's data file:

```json
// employees.json
{ "id": "550e8400-e29b-41d4-a716-446655440003", ... }

// leave_types.json
{ "id": "660e8400-e29b-41d4-a716-446655440001", ... }
```

## Database Validation

PostgreSQL will validate UUID format on INSERT:

```sql
-- This works (valid RFC 4122 v4 UUID)
INSERT INTO employees (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'John Doe');

-- This FAILS (invalid format)
INSERT INTO employees (id, name) 
VALUES ('emp-00000001-0000-0000-0000-000000000001', 'John Doe');
-- ERROR: invalid input syntax for type uuid
```

## Checklist for Data Generation Scripts

When implementing sample data generation:

- [ ] All ID fields use RFC 4122 v4 UUID format
- [ ] UUID generation is deterministic per entity type
- [ ] Each entity type gets a unique first octet prefix
- [ ] Foreign key references use matching UUIDs from source entities
- [ ] All UUIDs are valid and conform to RFC 4122
- [ ] Loading script uses parameterized queries
- [ ] Loading script verifies referential integrity before INSERT
- [ ] Database constraints validated after load

## References

- [RFC 4122 - UUID Specification](https://tools.ietf.org/html/rfc4122)
- [Node.js uuid Package](https://www.npmjs.com/package/uuid)
- [PostgreSQL UUID Type](https://www.postgresql.org/docs/current/datatype-uuid.html)

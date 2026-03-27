# Architecture Rules Starter Set

This folder contains rule files referenced by `MDT/architecture.json`.

Files:
- `layer-rules.json` - rules by code layer
- `module-type-rules.json` - rules by module type
- `interface-rules.json` - DTO and API conventions
- `data-rules.json` - key strategy and persistence conventions
- `concurrency-rules.json` - optimistic locking policy
- `audit-rules.json` - audit event and immutability rules

Recommended use:
1. Load `MDT/architecture.json`
2. Resolve referenced rule files
3. Merge global + layer + module type + concern-specific rules
4. Pass the merged rule set into the target skill/generator

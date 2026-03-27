# System Architecture

**System:** {{system_name}}
**Version:** {{version}}
**Date:** {{date}}

## Patterns
{{#patterns}}
- {{.}}
{{/patterns}}

## Layers
{{#layers}}
- {{.}}
{{/layers}}

## Module Types
{{#module_types}}
- {{.}}
{{/module_types}}

## Dependency Model
{{dependency_model}}

## Rule Files
- Layer Rules: {{rule_files.layer_rules}}
- Module Type Rules: {{rule_files.module_type_rules}}
- Interface Rules: {{rule_files.interface_rules}}
- Data Rules: {{rule_files.data_rules}}
- Concurrency Rules: {{rule_files.concurrency_rules}}
- Audit Rules: {{rule_files.audit_rules}}

## Global Rules
{{#global_rules}}
- {{.}}
{{/global_rules}}

## Tech
- Language: {{tech.language}}
- Runtime: {{tech.runtime}}
- Data Access: {{tech.dataAccess}}
- Database: {{tech.database}}
- Package Manager: {{tech.packageManager}}

## Notes
{{notes}}

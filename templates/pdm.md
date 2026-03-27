# Physical Data Model

System: {{system_name}}
Database: {{database}}

{{#tables}}
## {{name}}
- Primary Key: {{primary_key}}

### Columns
{{#columns}}
- {{name}} ({{type}}) {{#nullable}}NULL{{/nullable}}{{^nullable}}NOT NULL{{/nullable}}
{{/columns}}

### Indexes
{{#indexes}}
- {{name}}: {{columns}} {{#unique}}(unique){{/unique}}
{{/indexes}}

### Foreign Keys
{{#foreign_keys}}
- {{name}}: {{columns}} -> {{references}}
{{/foreign_keys}}

{{/tables}}

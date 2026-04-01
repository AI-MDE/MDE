# AI-Driven Pipeline — Architecture Reference

MDE is a command-driven, AI-orchestrated engineering system — not a chatbot. See [How to Use MDE](./how-to-use-mde.md) for the user guide and [Lifecycle](../lifecycle.md) for the phase diagram.

---

## Architecture Layers

### 1. Orchestrator

Responsible for:

- Mapping user command → internal command
- Checking prerequisites
- Calling skills
- Invoking MCP tools
- Writing artifacts
- Updating project state

---

### 2. Skills (AI Reasoning)

Examples:

- business_analysis
- system_design
- module_definition
- module_spec
- validation

Responsibilities:

- interpret inputs
- generate structured outputs
- enforce methodology rules

---

### 3. MCP Tools (Execution Layer)

Examples:

- file_manager
- json_validator
- traceability_engine
- architecture_validator
- code_generator

Responsibilities:

- read/write files
- validate schemas
- enforce rules
- generate outputs

---

## Command Registry 

Define all commands in:

- commands.json (machine)
- commands.md (human)

---

## Command Schema

```json
{
  "name": "generate_ldm",
  "label": "Generate LDM",
  "phase": "system_design",
  "intent": "generate",
  "requires": [
    "requirements.json",
    "architecture.json"
  ],
  "produces": [
    "ldm.md",
    "ldm.json"
  ],
  "calls": [
    "ldm_skill"
  ]
}
```

---

## Command Categories

### Validation
- Validate Requirements
- Validate Architecture
- Validate Module Spec
- Validate Traceability

### Generation
- Build System Design
- Generate LDM
- Generate PDM
- Generate SQL Schema
- Generate Module Spec
- Generate Module source code
- Generate document

### Refinement
- Refine Use Cases
- Refine Module Charter

### Governance
- Show Phase Status
- Show Missing Artifacts
- Show TOGAF Coverage
- Show Zackman Coverage

---

## Key Design Principles

### 1. Commands are first-class
Users explicitly control the pipeline.

### 2. Skills do thinking
They generate and interpret.

### 3. MCP tools enforce reality
They validate, persist, and execute.

### 4. Orchestrator controls flow
It ensures correctness and sequence.

### 5. Optimize for performance of AI

An important consideration of AI is to minimize tokens sent and received through the following:

1.  Send only what is required
2.  Utilize cached input whenever possible by keeping the input in same order of priority 
    - `AGNET.md`
    - `orchestrator.md`
    - compiled `commands-list`
    - common needed files for all phases
    -- `configuration.json`

    For BA relatd
    -- `ba-methodlogy`

    For Design related
    -- `design-methodology`
    -- `architecture`

3.  Code generation is conducted in two passes:
    A) Identify and outline modules (done in Design phase)
    
    B) for each module:
    -- send the above list +
        `architecture`
        `coding-standards` 
        `test-coverage`
    --  module specification 
        

---


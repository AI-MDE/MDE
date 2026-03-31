# AI-Driven Development Pipeline â€” Commands, Skills, MCP

## Overview

This document captures the design for building a multi-phase AI-driven software engineering system using:

- Skills (AI reasoning units)
- MCP Tools (execution & validation)
- Command Layer (user-driven workflow)

---

## Core Insight

This is NOT a chatbot.

This is a:

**Command-driven AI engineering workbench**

---

## Architecture Layers

### Streamlined Commands:
┌────────────────────────────────────────────────────────────┐
│                EXECUTION PIPELINE (AI-MDE)                 │
│                                                            │
│   1. refine-business-requirements                          │
│        ↓                                                   │
│   2. elaborate-system-design                               │
│        ↓                                                   │
│   3. generate-source-code                                  │
│        ↓                                                   │
│   4. package-application                                   │
│        ↓                                                   │
│   5. deploy-and-test                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘

These are NOT prompts â€” they are structured commands.

---

### 2. Orchestrator

Responsible for:

- Mapping user command â†’ internal command
- Checking prerequisites
- Calling skills
- Invoking MCP tools
- Writing artifacts
- Updating project state

---

### 3. Skills (AI Reasoning)

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

### 4. MCP Tools (Execution Layer)

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

## Example Flow

User:
> Validate Requirements

Orchestrator:
1. Resolve command
2. Check requirements exist
3. Call validation skill
4. Run json_validator
5. Generate report

---

User:
> Build System Design

Orchestrator:
1. Check requirements complete
2. Call system_design skill
3. Generate architecture.json / architecture.json

---

User:
> Generate LDM

Orchestrator:
1. Check architecture exists
2. Call LDM skill
3. Generate data model artifacts

---

## Project State Tracking

File: `project-state.json`

```json
{
  "current_phase": "system_design",
  "completed_commands": [
    "validate_requirements",
    "build_system_design"
  ],
  "artifacts": {
    "requirements": "complete",
    "architecture": "complete",
    "ldm": "missing"
  }
}
```

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

## Final Insight

This system becomes:

> **AI-Orchestrated Model-Driven Engineering Platform**

Not:
- a chatbot
- not just prompts
- not just tools

But a structured, controllable, extensible engineering system.


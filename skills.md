# Skills Registry

This file defines the AI skill layer for the multi-phase engineering pipeline.

## Purpose

Skills are phase-aware reasoning units. They do not own workflow control. The orchestrator invokes them in response to commands.

## Core Skills

### 1. requirements_validation
Validates requirement artifacts for completeness, ambiguity, readiness, and traceability.

### 2. system_design
Generates architecture artifacts from business analysis outputs.

### 3. logical_data_model
Builds the logical data model from requirements, glossary, and architecture.

### 4. module_definition
Defines modules, boundaries, ownership, interfaces, and dependencies.

### 5. module_specification
Generates schema, rules, state machines, and API contracts for a module.

### 6. architecture_validation
Checks architectural conformance against declared patterns, layers, and dependency rules.

### 7. governance_validation
Checks traceability, phase completeness, and governance coverage.

## Skill Execution Rules

- Skills consume structured inputs where possible.
- Skills must not invent upstream requirements.
- Skills may suggest missing artifacts but should not silently create unauthorized inputs.
- Skills should emit machine-readable outputs for downstream phases.

See `skills.json` for the machine-readable source of truth.

# orchestrator.json

This file is the machine-readable control layer for the AI engineering workbench.

## Purpose

The orchestrator is responsible for:

- resolving user commands
- checking prerequisites
- enforcing phase rules
- selecting skills and tools
- executing workflow steps
- persisting outputs
- updating project state
- returning results and next valid commands

## Key Idea

Commands are user-facing.  
Skills are reasoning units.  
Tools do execution and validation.  
The orchestrator is the controller that connects them.

## Core Responsibilities

1. Resolve user input to a canonical command
2. Check artifact prerequisites
3. Validate phase correctness
4. Invoke skills and permitted tools
5. Persist generated artifacts
6. Update `project-state.json`
7. Return outputs, blockers, warnings, and next commands

## Main Inputs

- `commands.json`
- `skills.json`
- `methodology.json`
- `architecture.json`
- `project-state.json`
- `configuration.json`

## Output Contract

The orchestrator should return:

- command
- status
- summary
- outputs
- warnings
- blockers
- next_valid_commands

See `orchestrator.json` for the source of truth.


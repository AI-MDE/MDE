{
  "name": "mdt_orchestrator",
  "version": "1.1",
  "description": "Command-driven orchestrator for {{PROJECT_NAME}}.",
  "inputs": {
    "command_registry": "{{MDE_PATH}}/ai-instructions/commands",
    "skills_registry": "{{MDE_PATH}}/ai-instructions/skills",
    "agent_bootstrap": "AGENT.md",
    "requirements_baseline": "../../ba/requirements.md",
    "analysis_status": "../../ba/analysis-status.md",
    "discovery_folder": "../../ba/discovery",
    "analyzed_folder": "../../ba/analyzed",
    "active_question_batch": "../../project/questions.json",
    "open_queue": "../../project/open-queue.json",
    "completed_questions": "../../project/completed-Questions.json",
    "application_definition": "../../application/application.json",
    "project_state": "../../project/project-state.json",
    "configuration": "../../configuration.json",
    "methodology": "../../project/methodology.json"
  },
  "state_model": {
    "project_state_file": "../../project/project-state.json",
    "fields": {
      "current_phase": "string",
      "completed_commands": ["string"],
      "failed_commands": ["string"],
      "artifacts": {
        "type": "object",
        "additionalProperties": {
          "type": "string",
          "enum": ["missing", "in_progress", "complete", "failed"]
        }
      },
      "last_command": "string",
      "last_run_at": "datetime",
      "recommended_next_command": "string",
      "next_valid_commands": [
        {
          "command": "string",
          "reason": "string"
        }
      ]
    }
  },
  "execution_pipeline": [
    { "step": 1, "name": "resolve_command", "description": "Resolve user input to a command JSON." },
    { "step": 2, "name": "load_context", "description": "Load required inputs for the resolved command." },
    { "step": 3, "name": "check_prerequisites", "description": "Verify required artifacts exist." },
    { "step": 4, "name": "execute_skill_flow", "description": "Run mapped skills and tools in order." },
    { "step": 5, "name": "persist_outputs", "description": "Write outputs to declared paths only." },
    { "step": 6, "name": "update_project_state", "description": "Refresh project state and next valid commands." }
  ],
  "phase_rules": {}
}

{
  "name": "{{COMMAND_NAME}}",
  "label": "{{COMMAND_LABEL}}",
  "phase": "{{PHASE}}",
  "intent": "{{INTENT}}",
  "ai": "{{AI_MODE}}",
  "requires": [
    "../../path/to/input-artifact.json"
  ],
  "produces": [
    "../../path/to/output-artifact.json"
  ],
  "calls": [
    "{{SKILL_NAME}}"
  ],
  "tools": [
    "file_manager"
  ],
  "rules": [
    "Do not invent missing upstream artifacts",
    "Write outputs only to declared paths"
  ]
}

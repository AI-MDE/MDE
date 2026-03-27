{
  "name": "{{SKILL_NAME}}",
  "purpose": "{{SKILL_PURPOSE}}",
  "inputs": [
    "../../path/to/input-artifact.json"
  ],
  "outputs": [
    "../../path/to/output-artifact.json"
  ],
  "artifacts": [
    "../../path/to/output-folder/"
  ],
  "rules": [
    "Use canonical sources as input",
    "Preserve schema compatibility of generated outputs"
  ],
  "uses_tools": [
    "file_manager"
  ],
  "next_phase": "{{NEXT_PHASE}}"
}

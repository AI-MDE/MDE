{
  "patterns": {
    "use-cases": "^uc-\\d+.*\\.md$",
    "entities": "^ent-.*\\.json$",
    "modules": "^(srv|dal)-\\d+.*\\.json$"
  },
  "catalog": [
    {
      "id": "phase0",
      "label": "Reference",
      "docs": [
        {
          "id": "methodology",
          "label": "Methodology",
          "docType": "reference",
          "file": "{{MDE_PATH}}/methodology/methodology.json",
          "includeIfExists": true
        },
        {
          "id": "architecture-system",
          "label": "System Architecture",
          "docType": "reference",
          "file": "{{MDE_PATH}}/architecture/architecture.json",
          "includeIfExists": true
        }
      ]
    }
  ]
}

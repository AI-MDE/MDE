# Formal Schemas for AI-Driven Multi-Phase Application Development

This document defines machine-readable schema shapes for each phase in the pipeline. These are not tied to one programming language. They are intended to serve as canonical handoff contracts between phases.

---

# 1. Requirement Record Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "RequirementRecord",
  "type": "object",
  "required": ["project", "goals", "actors"],
  "properties": {
    "project": { "type": "string" },
    "goals": {
      "type": "array",
      "items": { "type": "string" }
    },
    "actors": {
      "type": "array",
      "items": { "type": "string" }
    },
    "constraints": {
      "type": "array",
      "items": { "type": "string" }
    },
    "assumptions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "open_questions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "sources": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

# 2. Requirements Catalog Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "RequirementsCatalog",
  "type": "object",
  "required": ["requirements"],
  "properties": {
    "requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "type", "description", "priority"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["functional", "non_functional", "constraint", "business_rule"]
          },
          "description": { "type": "string" },
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          },
          "acceptance_criteria": {
            "type": "array",
            "items": { "type": "string" }
          },
          "related_functions": {
            "type": "array",
            "items": { "type": "string" }
          },
          "related_use_cases": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# 3. Business Function Breakdown Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BusinessFunctionBreakdown",
  "type": "object",
  "required": ["functions"],
  "properties": {
    "functions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "parent_id": { "type": ["string", "null"] },
          "description": { "type": "string" },
          "children": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# 4. Use Case Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UseCases",
  "type": "object",
  "required": ["use_cases"],
  "properties": {
    "use_cases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "primary_actor", "main_flow"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "primary_actor": { "type": "string" },
          "supporting_actors": {
            "type": "array",
            "items": { "type": "string" }
          },
          "preconditions": {
            "type": "array",
            "items": { "type": "string" }
          },
          "main_flow": {
            "type": "array",
            "items": { "type": "string" }
          },
          "alternate_flows": {
            "type": "array",
            "items": { "type": "string" }
          },
          "postconditions": {
            "type": "array",
            "items": { "type": "string" }
          },
          "related_requirements": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# 5. System Design Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SystemDesign",
  "type": "object",
  "required": ["system_name", "modules"],
  "properties": {
    "system_name": { "type": "string" },
    "design_principles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "external_actors": {
      "type": "array",
      "items": { "type": "string" }
    },
    "external_systems": {
      "type": "array",
      "items": { "type": "string" }
    },
    "modules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "responsibilities"],
        "properties": {
          "name": { "type": "string" },
          "responsibilities": {
            "type": "array",
            "items": { "type": "string" }
          },
          "depends_on": {
            "type": "array",
            "items": { "type": "string" }
          },
          "requirements": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# 6. Module Charter Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ModuleCharter",
  "type": "object",
  "required": ["module", "purpose", "responsibilities"],
  "properties": {
    "module": { "type": "string" },
    "purpose": { "type": "string" },
    "responsibilities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "non_responsibilities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "owned_entities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string" }
    },
    "interfaces": {
      "type": "array",
      "items": { "type": "string" }
    },
    "requirements": {
      "type": "array",
      "items": { "type": "string" }
    },
    "use_cases": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

# 7. Module Specification Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ModuleSpecification",
  "type": "object",
  "required": ["module", "entities", "rules", "states"],
  "properties": {
    "module": { "type": "string" },
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "fields"],
        "properties": {
          "name": { "type": "string" },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "type"],
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string" },
                "required": { "type": "boolean" },
                "description": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "condition", "action"],
        "properties": {
          "id": { "type": "string" },
          "condition": { "type": "string" },
          "action": { "type": "string" }
        }
      }
    },
    "states": {
      "type": "array",
      "items": { "type": "string" }
    },
    "transitions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["from", "to", "trigger"],
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "trigger": { "type": "string" }
        }
      }
    },
    "errors": {
      "type": "array",
      "items": { "type": "string" }
    },
    "events": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

# 8. Test Pack Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ModuleTestPack",
  "type": "object",
  "required": ["acceptance_tests"],
  "properties": {
    "acceptance_tests": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "scenario", "expected"],
        "properties": {
          "id": { "type": "string" },
          "requirement": { "type": "string" },
          "scenario": { "type": "string" },
          "expected": { "type": "string" }
        }
      }
    },
    "contract_tests": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "interface", "condition"],
        "properties": {
          "id": { "type": "string" },
          "interface": { "type": "string" },
          "condition": { "type": "string" },
          "expected": { "type": "string" }
        }
      }
    }
  }
}
```

---

# 9. Traceability Matrix Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TraceabilityMatrix",
  "type": "object",
  "required": ["trace"],
  "properties": {
    "trace": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["requirement", "module"],
        "properties": {
          "requirement": { "type": "string" },
          "business_function": { "type": "string" },
          "use_case": { "type": "string" },
          "module": { "type": "string" },
          "specs": {
            "type": "array",
            "items": { "type": "string" }
          },
          "tests": {
            "type": "array",
            "items": { "type": "string" }
          },
          "code": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# Notes

- Use JSON Schema for validation where possible.
- Use OpenAPI for API contracts.
- Use BPMN for workflow models.
- Use DMN for decision logic.
- Keep IDs stable across phases.
- Do not let downstream phases invent upstream identifiers.

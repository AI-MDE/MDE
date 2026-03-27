# Identify Domain

| Field | Value |
|-------|-------|
| `name` | `identify_domain` |
| `phase` | business_analysis |
| `intent` | research |
| `ai` | `required` |

---

## Requires

- ../../application/application.json

## Produces

- ../../ba/domain-brief.md

## Rules

- Identify the business domain and any sub-domains relevant to the application
- Define key domain terminology and concepts — this becomes the project glossary seed
- Identify domain experts, reference bodies, and authoritative sources
- Surface known complexity areas and domain-specific risks
- Output domain-brief.md — this feeds directly into perform_business_analysis and identify_external_references

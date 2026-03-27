# Select Methodology

| Field | Value |
|-------|-------|
| `name` | `select_methodology` |
| `phase` | project_initiation |
| `intent` | decide |
| `ai` | `required` |

---

## Requires

- ../../application/application.json

## Produces

- ../../mde/methodology/methodology-decision.md

## Rules

- Present the default MDE methodology and explain its principles
- Offer alternative methodology patterns if the team wants to explore (e.g. domain-driven, event-driven, CQRS-oriented)
- Get explicit team confirmation of the chosen methodology
- Record the decision with rationale and any customisations in methodology-decision.md
- If the default is accepted unchanged, record that explicitly — do not leave the decision implicit

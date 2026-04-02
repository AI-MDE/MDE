# Phase 2 — Business Analysis

Ingest raw project material and derive a structured requirements baseline. The AI asks targeted clarification questions until the baseline is stable.

---

## Commands

```claude
Identify Domain
Perform Business Analysis
Generate Business Functions
Generate Use Cases
Generate Glossary
Validate Requirements
```

---

## Typical flow

1. Drop source material (briefs, specs, notes, emails) into `ba/discovery/`
2. Run:
```claude
Perform Business Analysis
```
3. Review questions generated in `project/questions.json` — answer them directly in the file
4. Re-run `Perform Business Analysis` — accepted answers are incorporated, new questions generated for remaining gaps
5. Repeat until the question queue is empty or remaining items are explicitly deferred
6. Run:
```claude
Validate Requirements
```

---

## Artifacts

| Artifact | Path |
|---|---|
| Source material inbox | `ba/discovery/` |
| Processed source material | `ba/analyzed/` |
| Requirements baseline | `ba/requirements.md` |
| Analysis status | `ba/analysis-status.md` |
| Business functions | `ba/business-functions.md` |
| Use cases | `ba/use-cases/` |
| Glossary | `ba/glossary.md` |
| Active questions | `project/questions.json` |
| Deferred questions | `project/open-queue.json` |
| Answered questions | `project/completed-Questions.json` |

---

## Tips

- Drop all available source material before the first run — more context means fewer clarification rounds.
- Answer questions directly in `project/questions.json` — do not create a separate file.
- Deferred questions go to `project/open-queue.json` — revisit them before moving to System Design.
- `Validate Requirements` checks coverage, rule completeness, and traceability — run it before moving to Phase 3.
- Run `Generate Glossary` early — it feeds into design and code generation.

---

## Navigation

[← Phase 1 — Project Initiation](./01-project-initiation.md) &nbsp;|&nbsp; [Phase 3 — System Design →](./03-system-design.md)

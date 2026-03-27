# Perform Business Analysis

| Field | Value |
|-------|-------|
| `name` | `perform_business_analysis` |
| `phase` | business_analysis |
| `intent` | analyze_and_clarify |
| `ai` | `required` |
| `skill` | `business_analysis_from_sources` |

---

## Skill

Delegates to skill: `business_analysis_from_sources`

## Inputs

| Key                      | Path                                 |
|--------------------------|--------------------------------------|
| `source_folder`          | `../../ba/discovery`                 |
| `application_definition` | `../../application/application.json` |

## Outputs

| Key                   | Path                            |
|-----------------------|---------------------------------|
| `question_batch_file` | `../../project/questions.json`  |
| `ba_doc_file`         | `../../ba/requirements.md`      |
| `queue_file`          | `../../project/open-queue.json` |
| `status_doc_file`     | `../../ba/analysis-status.md`   |

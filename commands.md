# Command Capability Matrix

| Command | Complexity | Tool vs AI | Inputs | Outputs |
|---|---|---|---|---|
| Initiate Project | Low | Tool-only | (none) | requirements.json, architecture.json, package.json, tsconfig.json, .env |
| Validate Requirements | Medium | AI-optional | 1-BA/requirements.json, 1-BA/use-cases/*.md, 1-BA/business-functions.json | 1-BA/requirements-validation-report.json |
| Build System Design | High | AI-required | 1-BA/requirements.json, 1-BA/use-cases/*.md, 1-BA/business-functions.json | MDT/architecture.json, 2 Design/modules/module-catalog.json |
| Generate LDM | Medium | AI-required | 1-BA/requirements.json, 1-BA/glossary.md, MDT/architecture.json | 1-BA/data-model/logical-data-model.json |
| Generate Module Catalog | Medium | AI-required | MDT/architecture.json, 1-BA/requirements.json | 2 Design/modules/module-catalog.json |
| Generate Module Charter | High | AI-required | 2 Design/modules/module-catalog.json, MDT/architecture.json | 2 Design/modules/<type>/module-charter-<module>.md, 2 Design/modules/<type>/module-<module>.json |
| Generate Module Spec | High | AI-required | 2 Design/modules/<type>/module-<module>.json, 1-BA/requirements.json, MDT/architecture.json | 2 Design/modules/<type>/<module>/schema.json, rules.json, state-machine.json, api.yaml |
| Validate Architecture | High | AI-required | MDT/architecture.json | 2 Design/architecture-validation-report.json |
| Generate DAL | Medium | Tool-only | configuration.json, 2 Design/modules/dal/dal-*.json, 2 Design/modules/dal/*/schema.json, security-rules.md (optional) | src/dal/*.ts, src/dal/*.test.js, src/services/*.ts, src/services/*.test.js |
| Generate DAL from DB | Medium | Tool-only | configuration.json, .env (DATABASE_URL), 2 Design/modules/dal/dal-*.json, 2 Design/modules/dal/*/schema.json | src/dal/*.ts |
| Generate Source Code | High | AI-required | 2 Design/modules/<type>/<module>/schema.json, rules.json, state-machine.json, api.yaml | src/<layer>/**/*.ts, generated-manifest.json |
| Generate Documentation | Medium | AI-optional | configuration.json, MDT/templates/*, project artifacts | docs/*.md |
| Generate Sample Data | Medium | Tool-only | 1-BA/data-model/logical-data-model.json, 2 Design/entities/*.json | sampleData/*.json |
| Generate Diagrams | Medium | AI-optional | 1-BA/data-model/logical-data-model.json, MDT/architecture.json, 2 Design/modules/module-catalog.json | docs/diagrams/*.md, docs/diagrams/*.svg |
| Validate Traceability | High | AI-optional | 1-BA/requirements.json, 2 Design/modules/module-catalog.json, 2 Design/modules/module-tests.json | 2 Design/traceability-validation-report.json, 2 Design/trace-matrix.json |
| Show Phase Status | Low | Tool-only | methodology.json, project-state.json | work/phase-status-report.json |


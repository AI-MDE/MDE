# source_code_generation

| Field | Value |
|-------|-------|
| `name` | `source_code_generation` |
| `next_phase` | development |

---

## Purpose

Generate application source code from module specifications, following the layer structure and naming conventions in architecture.json

## Rules

- Read architecture.json for folder structure, naming conventions, and layer rules before generating
- Follow codegen.structure.layers for output paths â€” src/{module}/domain/, src/{module}/service/, etc.
- Follow codegen.naming for class and file naming conventions
- Entity must expose create() factory for new instances and rehydrate() factory for repository reconstruction
- Service class: one public method per use case â€” authorize, load, act, save, emit event
- QueryService: stateless, reads only, returns ReadDto â€” must not touch domain layer
- Mapper: pure field translation only â€” no business logic
- Repository implementation: raw SQL, parameterized queries only
- Commands: one per write operation, fields only, no behavior
- Method-level traceability docs are mandatory for generated methods in controller/service/domain/query_service/data_access layers
- Each method doc block must include @requirement and @design_concern tags; add @use_case when applicable
- Requirement references in method docs must be valid IDs from BA artifacts (FR-*, BR-*, NFR-*), or INTERNAL for technical-only methods
- Event types: typed aliases of DomainEvent<T> â€” base type in shared/events/domain-event.ts
- DomainEventPublisher interface in shared/events/domain-event-publisher.ts
- Emit deterministic outputs â€” same inputs must produce same outputs
- Read config.test.* for test output paths â€” default to test/unit and test/integration
- Unit tests go to test/unit/{module}/ â€” cover domain (entity, validator, state-machine) and service layers; mock all dependencies
- Integration tests go to test/integration/{module}/ â€” cover data_access (repository against real DB) and controller (HTTP); no mocks
- Test framework is Jest â€” use describe/it/expect; import from jest for mocks
- Each service test: one describe block per service class, one it() per error condition and one for the happy path
- Each entity test: cover create(), rehydrate(), and every state transition method
- Each validator test: cover every rule â€” one it() per pass case and one per throw case
- Do not generate test files for dto, mapper, or repository interface layers
- Generate package.json if it does not exist â€” derive name and version from config.project, tech stack from architecture.json; always include jest scripts for unit and integration
- Generate tsconfig.json if it does not exist â€” derive target and module from architecture.json tech; outDir=dist, rootDir=src, exclude test/
- Never overwrite package.json or tsconfig.json if they already exist
- CRITICAL: The generated src/index.ts (Express entry point) must include ALL write endpoints (POST, PUT, PATCH, DELETE) for every module, not just GET endpoints. For every module that has create/update/delete operations, generate the corresponding mutation routes. Missing mutation endpoints cause silent 404 failures in the UI.
- CRITICAL: Every mutation endpoint response must include a descriptive error message in the JSON body under the 'error' key â€” e.g. { error: 'Leave request not found or cannot be modified' }. Generic 500 responses without detail make debugging impossible.
- CRITICAL: The dev script must be 'ts-node src/index.ts'. The start script must be 'node dist/index.js'. Never swap them. Running start before build causes 404s from a stale dist/.
- The package.json must include a 'dev' script using ts-node for development without a build step.

## Tools Used

- file_manager

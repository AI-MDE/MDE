# Setup Dev Environment

| Field | Value |
|-------|-------|
| `name` | `setup_dev_environment` |
| `phase` | development |
| `intent` | generate |
| `ai` | `required` |

---

## Tools

- file_manager

## Rules

- Overwrite package.json â€” derive name from config.project.name, version from config.project.version; set name to kebab-case
- Include scripts: build (tsc), start (node dist/index.js), test (jest), test:unit (jest --testPathPattern=test/unit), test:integration (jest --testPathPattern=test/integration), dev (ts-node src/index.ts), seed (node scripts/loadSeedData.js)
- Include dependencies: mysql2, uuid; include devDependencies: typescript, ts-jest, @types/jest, @types/node, jest, @types/mysql2
- Jest config: preset=ts-jest, testEnvironment=node, testMatch=[**/*.test.ts], collectCoverage=false
- Overwrite tsconfig.json â€” target ES2020, module commonjs, strict true, esModuleInterop true, skipLibCheck true, outDir=dist, rootDir=src; include src/**/*.ts and test/**/*.ts; exclude node_modules, dist
- Generate .env only if it does not already exist â€” include: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME with placeholder values; include PORT=3000
- Add .env to .gitignore if .gitignore exists

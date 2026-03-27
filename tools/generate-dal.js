#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};
const parseBool = (value, fallback) => {
  if (value === undefined) return fallback;
  const normalized = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const root = process.cwd();
const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'configuration.json' });

let configuration;
try {
  configuration = manager.load();
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
}

const configPaths = manager.getPaths();
const projectBase = manager.getProjectRoot();
const resolveProject = (value) => (path.isAbsolute(value) ? value : path.resolve(projectBase, value));

const modulesDir = resolveProject(configPaths['modules-dir'] || 'design/modules');
const dalSpecDir = path.join(modulesDir, 'dal');
const outputDir = resolveProject(configPaths['dal-dir'] || 'src/dal');
const servicesDir = resolveProject(configPaths['services-dir'] || 'src/services');
const architectureJsonPath = configPaths['architecture-json']
  ? resolveProject(configPaths['architecture-json'])
  : null;
let generateServiceStubs = false;
let generateTests = false;
const securityRulesPath = configPaths['security-rules']
  ? resolveProject(configPaths['security-rules'])
  : null;
let securityRules = null;

if (architectureJsonPath && fs.existsSync(architectureJsonPath)) {
  try {
    const arch = JSON.parse(fs.readFileSync(architectureJsonPath, 'utf8'));
    generateServiceStubs = Boolean(arch?.codegen?.dal?.generateServiceStubs);
    generateTests = Boolean(arch?.codegen?.dal?.generateTests);
  } catch (err) {
    console.warn(`[WARN] Failed to parse architecture.json at ${architectureJsonPath}: ${err.message}`);
  }
}
generateServiceStubs = parseBool(getArgValue('--services'), generateServiceStubs);
generateTests = parseBool(getArgValue('--tests'), generateTests);

if (securityRulesPath && fs.existsSync(securityRulesPath)) {
  try {
    const raw = fs.readFileSync(securityRulesPath, 'utf8');
    const match = raw.match(/```json\\s*([\\s\\S]*?)\\s*```/i);
    if (match) {
      securityRules = JSON.parse(match[1]);
    }
  } catch (err) {
    console.warn(`[WARN] Failed to parse security-rules.md at ${securityRulesPath}: ${err.message}`);
  }
}

if (!fs.existsSync(dalSpecDir)) {
  console.warn(`[WARN] DAL modules folder not found: ${dalSpecDir}`);
  console.warn('[WARN] Create DAL specs first (e.g., /mde generate module spec) then rerun generate DAL.');
  fs.mkdirSync(dalSpecDir, { recursive: true });
}

fs.mkdirSync(outputDir, { recursive: true });
if (generateServiceStubs) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

const dbFile = path.join(outputDir, 'db.ts');
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(
    dbFile,
    `// Auto-generated DAL contract\nexport interface Db {\n  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;\n}\n`,
    'utf8'
  );
}

const toTsType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('int') || t === 'number' || t === 'decimal' || t === 'float' || t === 'double') return 'number';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  if (t === 'json' || t === 'jsonb') return 'any';
  return 'string';
};

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
const sampleValue = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('uuid')) return '00000000-0000-0000-0000-000000000000';
  if (t.includes('int') || t === 'number') return 1;
  if (t === 'decimal' || t === 'float' || t === 'double') return 1.5;
  if (t === 'boolean' || t === 'bool') return true;
  if (t === 'datetime' || t === 'timestamp') return '2026-01-01T00:00:00Z';
  if (t === 'date') return '2026-01-01';
  if (t === 'json' || t === 'jsonb') return { sample: true };
  return 'sample';
};
const toPascal = (value) => value
  .replace(/[_-]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join('');

  const moduleFiles = fs.readdirSync(dalSpecDir).filter((f) => /^dal-.*\.json$/i.test(f));
if (moduleFiles.length === 0) {
  console.warn('[WARN] No DAL module spec files found.');
}

let generated = 0;
const manifest = [];

for (const file of moduleFiles) {
  const modulePath = path.join(dalSpecDir, file);
  let mod;
  try {
    mod = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse ${modulePath}: ${err.message}`);
    continue;
  }

  const moduleName = mod.moduleName || mod.name || file.replace(/^mod-\d+-/i, '').replace(/\.json$/i, '');
  const schemaPath = path.join(dalSpecDir, moduleName, 'schema.json');
  if (!fs.existsSync(schemaPath)) {
    console.warn(`[WARN] schema.json not found for ${moduleName} at ${schemaPath}`);
    continue;
  }

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse ${schemaPath}: ${err.message}`);
    continue;
  }

  const entities = Array.isArray(schema.entities) ? schema.entities : [];
  if (entities.length === 0) {
    console.warn(`[WARN] No entities defined in ${schemaPath}`);
    continue;
  }

  const outFile = path.join(outputDir, `${moduleName}.dal.ts`);
  const lines = [];
  lines.push('// Auto-generated by MDT generate-dal');
  lines.push("import { Db } from './db';");
  if (securityRules && securityRules.entities) {
    lines.push('');
    lines.push('type AuthContext = { userId?: string; roles?: string[]; tenantId?: string };');
    lines.push('const hasRole = (ctx, allowed) => Array.isArray(ctx?.roles) && allowed.some(r => ctx.roles.includes(r));');
    lines.push('const assertRole = (ctx, allowed, action, entity) => {');
    lines.push('  if (!Array.isArray(allowed) || allowed.length === 0) {');
    lines.push('    throw new Error(`ACL_DENIED: ${action} ${entity}`);');
    lines.push('  }');
    lines.push('  if (!hasRole(ctx, allowed)) {');
    lines.push('    throw new Error(`ACL_DENIED: ${action} ${entity}`);');
    lines.push('  }');
    lines.push('};');
  }
  lines.push('');

  entities.forEach((entity) => {
    const entityName = entity.name || 'Entity';
    const tableName = entity.table || entity.name;
    const fields = Array.isArray(entity.fields) ? entity.fields : [];
    const pkField = fields.find((f) => f.primaryKey) || fields.find((f) => (f.name || '').toLowerCase() === 'id') || fields[0];
    const pkName = pkField ? pkField.name : null;
    const immutable = entity.immutable === true;

    const tsFields = fields.map((f) => {
      const optional = f.required ? '' : '?';
      return `  ${f.name}${optional}: ${toTsType(f.type)};`;
    });

    lines.push(`export interface ${entityName} {`);
    lines.push(...tsFields);
    lines.push('}');
    lines.push('');
    lines.push(`export class ${entityName}Repository {`);
    lines.push('  constructor(private readonly db: Db) {}');
    lines.push('');

    const acl = securityRules?.entities?.[entityName] || null;
    const readRoles = Array.isArray(acl?.read) ? acl.read : null;
    const writeRoles = Array.isArray(acl?.write) ? acl.write : null;

    if (fields.length > 0) {
      const colList = fields.map((f) => `"${f.name}"`).join(', ');
      const params = fields.map((_, idx) => `$${idx + 1}`).join(', ');
      const valueList = fields.map((f) => `record.${f.name} ?? null`).join(', ');
      const ctxParam = writeRoles ? ', ctx?: AuthContext' : '';
      lines.push(`  async create(record: ${entityName}${ctxParam}): Promise<${entityName} | null> {`);
      if (writeRoles) {
        lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'create', '${entityName}');`);
      }
      lines.push(`    const text = \`INSERT INTO "${tableName}" (${colList}) VALUES (${params}) RETURNING *\`;`);
      lines.push(`    const res = await this.db.query<${entityName}>(text, [${valueList}]);`);
      lines.push('    return res.rows[0] || null;');
      lines.push('  }');
      lines.push('');
    }

    if (pkName) {
      const ctxParam = readRoles ? ', ctx?: AuthContext' : '';
      lines.push(`  async findById(id: ${toTsType(pkField.type)}${ctxParam}): Promise<${entityName} | null> {`);
      if (readRoles) {
        lines.push(`    assertRole(ctx, ${JSON.stringify(readRoles)}, 'read', '${entityName}');`);
      }
      lines.push(`    const text = \`SELECT * FROM "${tableName}" WHERE "${pkName}" = $1\`;`);
      lines.push(`    const res = await this.db.query<${entityName}>(text, [id]);`);
      lines.push('    return res.rows[0] || null;');
      lines.push('  }');
      lines.push('');
    }

    if (pkName) {
      const ctxParam = readRoles ? ', ctx?: AuthContext' : '';
      lines.push(`  async list(limit = 100, offset = 0${ctxParam}): Promise<${entityName}[]> {`);
      if (readRoles) {
        lines.push(`    assertRole(ctx, ${JSON.stringify(readRoles)}, 'read', '${entityName}');`);
      }
      lines.push(`    const text = \`SELECT * FROM "${tableName}" ORDER BY "${pkName}" LIMIT $1 OFFSET $2\`;`);
      lines.push('    const res = await this.db.query<'+entityName+'>(text, [limit, offset]);');
      lines.push('    return res.rows;');
      lines.push('  }');
      lines.push('');
    }

    if (!immutable && pkName) {
      const upFields = fields.filter((f) => f.name !== pkName);
      if (upFields.length > 0) {
        const setList = upFields.map((f, idx) => `"${f.name}" = $${idx + 2}`).join(', ');
        const valueList = upFields.map((f) => `record.${f.name} ?? null`).join(', ');
        const ctxParam = writeRoles ? ', ctx?: AuthContext' : '';
        lines.push(`  async update(id: ${toTsType(pkField.type)}, record: Partial<${entityName}>${ctxParam}): Promise<${entityName} | null> {`);
        if (writeRoles) {
          lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'update', '${entityName}');`);
        }
        lines.push(`    const text = \`UPDATE "${tableName}" SET ${setList} WHERE "${pkName}" = $1 RETURNING *\`;`);
        lines.push(`    const res = await this.db.query<${entityName}>(text, [id, ${valueList}]);`);
        lines.push('    return res.rows[0] || null;');
        lines.push('  }');
        lines.push('');
      }

      const ctxParam = writeRoles ? ', ctx?: AuthContext' : '';
      lines.push(`  async remove(id: ${toTsType(pkField.type)}${ctxParam}): Promise<void> {`);
      if (writeRoles) {
        lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'remove', '${entityName}');`);
      }
      lines.push(`    const text = \`DELETE FROM "${tableName}" WHERE "${pkName}" = $1\`;`);
      lines.push('    await this.db.query(text, [id]);');
      lines.push('  }');
      lines.push('');
    }

    if (immutable) {
      lines.push('  // Immutable entity: update/remove intentionally omitted.');
      lines.push('');
    }

    lines.push('}');
    lines.push('');
  });

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  generated += 1;
  manifest.push({ module: moduleName, file: path.relative(projectBase, outFile).replace(/\\/g, '/') });

  if (generateServiceStubs) {
    const serviceFile = path.join(servicesDir, `${moduleName}.service.ts`);
    if (!fs.existsSync(serviceFile)) {
      const serviceLines = [];
      const baseName = toPascal(moduleName);
      const serviceName = baseName.endsWith('Service') ? baseName : `${baseName}Service`;
      const repoImports = entities.map((e) => `${e.name}Repository`);
      const typeImports = entities.map((e) => e.name);
      const importList = [...typeImports, ...repoImports].join(', ');
      serviceLines.push('// Auto-generated by MDT generate-dal');
      serviceLines.push(`import { Db } from '../dal/db';`);
      serviceLines.push(`import { ${importList} } from '../dal/${moduleName}.dal';`);
      serviceLines.push('');
      serviceLines.push(`export class ${serviceName} {`);
      serviceLines.push('  constructor(private readonly db: Db) {}');
      serviceLines.push('');
      entities.forEach((entity) => {
        const repoName = `${entity.name}Repository`;
        const repoVar = `${entity.name.charAt(0).toLowerCase()}${entity.name.slice(1)}Repo`;
        serviceLines.push(`  private ${repoVar} = new ${repoName}(this.db);`);
      });
      serviceLines.push('');
      entities.forEach((entity) => {
        const repoVar = `${entity.name.charAt(0).toLowerCase()}${entity.name.slice(1)}Repo`;
        const entityType = entity.name;
        const fields = Array.isArray(entity.fields) ? entity.fields : [];
        const pkField = fields.find((f) => f.primaryKey) || fields.find((f) => (f.name || '').toLowerCase() === 'id') || fields[0];
        const pkName = pkField ? pkField.name : 'id';
        const pkType = pkField ? toTsType(pkField.type) : 'string';
        const immutable = entity.immutable === true;

        serviceLines.push(`  async create${entityType}(record: ${entityType}) {`);
        serviceLines.push(`    return this.${repoVar}.create(record);`);
        serviceLines.push('  }');
        serviceLines.push('');
        serviceLines.push(`  async get${entityType}ById(${pkName}: ${pkType}) {`);
        serviceLines.push(`    return this.${repoVar}.findById(${pkName});`);
        serviceLines.push('  }');
        serviceLines.push('');
        serviceLines.push(`  async list${entityType}s(limit = 100, offset = 0) {`);
        serviceLines.push(`    return this.${repoVar}.list(limit, offset);`);
        serviceLines.push('  }');
        serviceLines.push('');
        if (!immutable) {
          serviceLines.push(`  async update${entityType}(${pkName}: ${pkType}, record: Partial<${entityType}>) {`);
          serviceLines.push(`    return this.${repoVar}.update(${pkName}, record);`);
          serviceLines.push('  }');
          serviceLines.push('');
          serviceLines.push(`  async remove${entityType}(${pkName}: ${pkType}) {`);
          serviceLines.push(`    return this.${repoVar}.remove(${pkName});`);
          serviceLines.push('  }');
          serviceLines.push('');
        }
      });
      serviceLines.push('}');
      fs.writeFileSync(serviceFile, serviceLines.join('\n'), 'utf8');
      manifest.push({ module: moduleName, file: path.relative(projectBase, serviceFile).replace(/\\/g, '/') });
    }
  }

  if (generateServiceStubs && generateTests) {
    const serviceTestFile = path.join(servicesDir, `${moduleName}.service.test.js`);
    if (!fs.existsSync(serviceTestFile)) {
      const testLines = [];
      const baseName = toPascal(moduleName);
      const serviceClass = baseName.endsWith('Service') ? baseName : `${baseName}Service`;
      testLines.push("'use strict';");
      testLines.push('');
      testLines.push("require('ts-node/register');");
      testLines.push("const test = require('node:test');");
      testLines.push("const assert = require('node:assert');");
      testLines.push(`const { ${serviceClass} } = require('./${moduleName}.service');`);
      testLines.push('');
      testLines.push('function mockDb(rows = []) {');
      testLines.push('  return { query: async () => ({ rows }) };');
      testLines.push('}');
      testLines.push('');
      entities.forEach((entity) => {
        const fields = Array.isArray(entity.fields) ? entity.fields : [];
        const rowFields = fields.map((f) => `  ${f.name}: ${JSON.stringify(sampleValue(f.type))}`);
        const rowName = `${entity.name.toUpperCase()}_ROW`;
        testLines.push(`const ${rowName} = {`);
        testLines.push(rowFields.join(',\n'));
        testLines.push('};');
        testLines.push('');

        testLines.push(`test('${serviceClass} create${entity.name} returns row', async () => {`);
        testLines.push(`  const svc = new ${serviceClass}(mockDb([${rowName}]));`);
        testLines.push(`  const result = await svc.create${entity.name}(${rowName});`);
        testLines.push(`  assert.deepEqual(result, ${rowName});`);
        testLines.push('});');
        testLines.push('');

        const pkField = fields.find((f) => f.primaryKey) || fields.find((f) => (f.name || '').toLowerCase() === 'id') || fields[0];
        const pkName = pkField ? pkField.name : null;
        if (pkName) {
          testLines.push(`test('${serviceClass} get${entity.name}ById returns row', async () => {`);
          testLines.push(`  const svc = new ${serviceClass}(mockDb([${rowName}]));`);
          testLines.push(`  const result = await svc.get${entity.name}ById(${rowName}.${pkName});`);
          testLines.push(`  assert.deepEqual(result, ${rowName});`);
          testLines.push('});');
          testLines.push('');
        }

        testLines.push(`test('${serviceClass} list${entity.name}s returns rows', async () => {`);
        testLines.push(`  const svc = new ${serviceClass}(mockDb([${rowName}]));`);
        testLines.push(`  const result = await svc.list${entity.name}s(10, 0);`);
        testLines.push(`  assert.deepEqual(result, [${rowName}]);`);
        testLines.push('});');
        testLines.push('');
      });
      fs.writeFileSync(serviceTestFile, testLines.join('\n'), 'utf8');
      manifest.push({ module: moduleName, file: path.relative(projectBase, serviceTestFile).replace(/\\/g, '/') });
    }
  }

  if (generateTests) {
    const testFile = path.join(outputDir, `${moduleName}.dal.test.js`);
    if (!fs.existsSync(testFile)) {
      const testLines = [];
      testLines.push("'use strict';");
      testLines.push('');
      testLines.push("require('ts-node/register');");
      testLines.push("const test = require('node:test');");
      testLines.push("const assert = require('node:assert');");
      testLines.push(`const { ${entities.map((e) => `${e.name}Repository`).join(', ')} } = require('./${moduleName}.dal');`);
      testLines.push('');
      testLines.push('function mockDb(rows = []) {');
      testLines.push('  return { query: async () => ({ rows }) };');
      testLines.push('}');
      testLines.push('');
      entities.forEach((entity) => {
        const fields = Array.isArray(entity.fields) ? entity.fields : [];
        const rowFields = fields.map((f) => `  ${f.name}: ${JSON.stringify(sampleValue(f.type))}`);
        const rowName = `${entity.name.toUpperCase()}_ROW`;
        testLines.push(`const ${rowName} = {`);
        testLines.push(rowFields.join(',\n'));
        testLines.push('};');
        testLines.push('');
        const repoName = `${entity.name}Repository`;
        const pkField = fields.find((f) => f.primaryKey) || fields.find((f) => (f.name || '').toLowerCase() === 'id') || fields[0];
        const pkName = pkField ? pkField.name : null;
        const immutable = entity.immutable === true;

        const acl = securityRules?.entities?.[entity.name] || null;
        const readRoles = Array.isArray(acl?.read) ? acl.read : null;
        const writeRoles = Array.isArray(acl?.write) ? acl.write : null;
        const ctxRead = readRoles ? `, { roles: ${JSON.stringify(readRoles)} }` : '';
        const ctxWrite = writeRoles ? `, { roles: ${JSON.stringify(writeRoles)} }` : '';

        testLines.push(`test('${repoName} create returns row', async () => {`);
        testLines.push(`  const repo = new ${repoName}(mockDb([${rowName}]));`);
        testLines.push(`  const result = await repo.create(${rowName}${ctxWrite});`);
        testLines.push(`  assert.deepEqual(result, ${rowName});`);
        testLines.push('});');
        testLines.push('');

        if (pkName) {
          testLines.push(`test('${repoName} findById returns row', async () => {`);
          testLines.push(`  const repo = new ${repoName}(mockDb([${rowName}]));`);
          testLines.push(`  const result = await repo.findById(${rowName}.${pkName}${ctxRead});`);
          testLines.push(`  assert.deepEqual(result, ${rowName});`);
          testLines.push('});');
          testLines.push('');
        }

        testLines.push(`test('${repoName} list returns rows', async () => {`);
        testLines.push(`  const repo = new ${repoName}(mockDb([${rowName}]));`);
        testLines.push(`  const result = await repo.list(10, 0${ctxRead});`);
        testLines.push(`  assert.deepEqual(result, [${rowName}]);`);
        testLines.push('});');
        testLines.push('');

        if (immutable) {
          testLines.push(`test('${repoName} immutable has no update/remove', () => {`);
          testLines.push(`  const repo = new ${repoName}(mockDb([${rowName}]));`);
          testLines.push('  assert.strictEqual(typeof repo.update, \"undefined\");');
          testLines.push('  assert.strictEqual(typeof repo.remove, \"undefined\");');
          testLines.push('});');
          testLines.push('');
        }
      });
      fs.writeFileSync(testFile, testLines.join('\n'), 'utf8');
      manifest.push({ module: moduleName, file: path.relative(projectBase, testFile).replace(/\\/g, '/') });
    }
  }
}

console.log(`Generated ${generated} DAL module file(s).`);
if (manifest.length > 0) {
  console.log('Outputs:');
  manifest.forEach((m) => console.log(`- ${m.module}: ${m.file}`));
}

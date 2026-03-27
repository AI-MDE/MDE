#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { ConfigurationManager } = require('./lib/config-manager');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

const loadDotEnv = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
};

const root = process.cwd();
const resolveRoot = (value) => (path.isAbsolute(value) ? value : path.resolve(root, value));
const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'sample/configuration.json' });

let configuration;
try {
  configuration = manager.load();
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
}

const projectBase = manager.getProjectRoot();
const resolveProject = (value) => (path.isAbsolute(value) ? value : path.resolve(projectBase, value));
const configPaths = manager.getPaths();

loadDotEnv(path.join(projectBase, '.env'));
loadDotEnv(path.join(projectBase, '..', '.env'));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL not set in .env');
  process.exit(1);
}

const schemaName = process.env.DB_SCHEMA || configPaths['db-schema'] || 'public';
const dbTest = (getArgValue('--db-test') || 'false').toLowerCase();

const modulesDir = resolveProject(configPaths['modules-dir'] || '2 Design/modules');
const dalSpecDir = path.join(modulesDir, 'dal');
const outputDir = resolveProject(configPaths['dal-dir'] || 'src/dal');
const securityRulesPath = configPaths['security-rules']
  ? resolveProject(configPaths['security-rules'])
  : null;

if (!fs.existsSync(dalSpecDir)) {
  console.error(`[ERROR] DAL modules folder not found: ${dalSpecDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const requireFromProject = createRequire(path.join(projectBase, 'package.json'));
let Client;
try {
  ({ Client } = requireFromProject('pg'));
} catch (err) {
  console.error('[ERROR] pg not installed. Run npm install in project first.');
  process.exit(1);
}

let securityRules = null;
if (securityRulesPath && fs.existsSync(securityRulesPath)) {
  try {
    const raw = fs.readFileSync(securityRulesPath, 'utf8');
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match) {
      securityRules = JSON.parse(match[1]);
    }
  } catch (err) {
    console.warn(`[WARN] Failed to parse security-rules.md at ${securityRulesPath}: ${err.message}`);
  }
}

const toTsType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('int') || t === 'number' || t === 'decimal' || t === 'numeric' || t === 'float' || t === 'double') return 'number';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  if (t === 'json' || t === 'jsonb') return 'any';
  return 'string';
};

async function loadColumns(client, table) {
  const res = await client.query(
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema = $1 and table_name = $2
     order by ordinal_position`,
    [schemaName, table]
  );
  return res.rows;
}

async function loadPrimaryKey(client, table) {
  const res = await client.query(
    `select kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
     where tc.constraint_type = 'PRIMARY KEY'
       and tc.table_schema = $1
       and tc.table_name = $2
     order by kcu.ordinal_position`,
    [schemaName, table]
  );
  return res.rows.map(r => r.column_name);
}

async function tableExists(client, table) {
  const res = await client.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = $2`,
    [schemaName, table]
  );
  return res.rowCount > 0;
}

(async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  if (dbTest === 'true' || dbTest === 'only') {
    try {
      await client.query('select 1');
      const schemaRes = await client.query(
        'select schema_name from information_schema.schemata where schema_name = $1',
        [schemaName]
      );
      if (schemaRes.rowCount === 0) {
        console.error(`[ERROR] Schema not found: ${schemaName}`);
        await client.end();
        process.exit(1);
      }
      console.log(`[OK] DB connection ok. Schema: ${schemaName}`);
    } catch (err) {
      console.error(`[ERROR] DB connection test failed: ${err.message}`);
      await client.end();
      process.exit(1);
    }
    if (dbTest === 'only') {
      await client.end();
      process.exit(0);
    }
  }

  const moduleFiles = fs.readdirSync(dalSpecDir).filter((f) => /^dal-.*\.json$/i.test(f));
  if (moduleFiles.length === 0) {
    console.warn('[WARN] No DAL module spec files found.');
  }

  let generated = 0;
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
    lines.push('// Auto-generated by MDT generate-dal-from-db');
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

    for (const entity of entities) {
      const entityName = entity.name || 'Entity';
      const tableName = entity.table || entity.name;
      const immutable = entity.immutable === true;

      const exists = await tableExists(client, tableName);
      if (!exists) {
        console.warn(`[WARN] Table ${schemaName}.${tableName} not found; skipping ${entityName}`);
        continue;
      }

      const columns = await loadColumns(client, tableName);
      const pkCols = await loadPrimaryKey(client, tableName);
      const pkName = pkCols[0] || (columns[0] ? columns[0].column_name : null);
      const pkType = columns.find(c => c.column_name === pkName)?.data_type || 'text';

      lines.push(`export interface ${entityName} {`);
      columns.forEach(col => {
        const optional = col.is_nullable === 'YES' ? '?' : '';
        lines.push(`  ${col.column_name}${optional}: ${toTsType(col.data_type)};`);
      });
      lines.push('}');
      lines.push('');
      lines.push(`export class ${entityName}Repository {`);
      lines.push('  constructor(private readonly db: Db) {}');
      lines.push('');

      const acl = securityRules?.entities?.[entityName] || null;
      const readRoles = Array.isArray(acl?.read) ? acl.read : null;
      const writeRoles = Array.isArray(acl?.write) ? acl.write : null;

      const colList = columns.map(c => `"${c.column_name}"`).join(', ');
      const params = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      const valueList = columns.map(c => `record.${c.column_name} ?? null`).join(', ');

      const ctxWrite = writeRoles ? ', ctx?: AuthContext' : '';
      lines.push(`  async create(record: ${entityName}${ctxWrite}): Promise<${entityName} | null> {`);
      if (writeRoles) lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'create', '${entityName}');`);
      lines.push(`    const text = \\`INSERT INTO "${tableName}" (${colList}) VALUES (${params}) RETURNING *\\`;`);
      lines.push(`    const res = await this.db.query<${entityName}>(text, [${valueList}]);`);
      lines.push('    return res.rows[0] || null;');
      lines.push('  }');
      lines.push('');

      if (pkName) {
        const ctxRead = readRoles ? ', ctx?: AuthContext' : '';
        lines.push(`  async findById(id: ${toTsType(pkType)}${ctxRead}): Promise<${entityName} | null> {`);
        if (readRoles) lines.push(`    assertRole(ctx, ${JSON.stringify(readRoles)}, 'read', '${entityName}');`);
        lines.push(`    const text = \\`SELECT * FROM "${tableName}" WHERE "${pkName}" = $1\\`;`);
        lines.push(`    const res = await this.db.query<${entityName}>(text, [id]);`);
        lines.push('    return res.rows[0] || null;');
        lines.push('  }');
        lines.push('');
      }

      if (pkName) {
        const ctxRead = readRoles ? ', ctx?: AuthContext' : '';
        lines.push(`  async list(limit = 100, offset = 0${ctxRead}): Promise<${entityName}[]> {`);
        if (readRoles) lines.push(`    assertRole(ctx, ${JSON.stringify(readRoles)}, 'read', '${entityName}');`);
        lines.push(`    const text = \\`SELECT * FROM "${tableName}" ORDER BY "${pkName}" LIMIT $1 OFFSET $2\\`;`);
        lines.push(`    const res = await this.db.query<${entityName}>(text, [limit, offset]);`);
        lines.push('    return res.rows;');
        lines.push('  }');
        lines.push('');
      }

      if (!immutable && pkName) {
        const upCols = columns.filter(c => c.column_name !== pkName);
        if (upCols.length) {
          const setList = upCols.map((c, idx) => `"${c.column_name}" = $${idx + 2}`).join(', ');
          const valueListUpd = upCols.map(c => `record.${c.column_name} ?? null`).join(', ');
          const ctxWrite2 = writeRoles ? ', ctx?: AuthContext' : '';
          lines.push(`  async update(id: ${toTsType(pkType)}, record: Partial<${entityName}>${ctxWrite2}): Promise<${entityName} | null> {`);
          if (writeRoles) lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'update', '${entityName}');`);
          lines.push(`    const text = \\`UPDATE "${tableName}" SET ${setList} WHERE "${pkName}" = $1 RETURNING *\\`;`);
          lines.push(`    const res = await this.db.query<${entityName}>(text, [id, ${valueListUpd}]);`);
          lines.push('    return res.rows[0] || null;');
          lines.push('  }');
          lines.push('');
        }

        const ctxWrite3 = writeRoles ? ', ctx?: AuthContext' : '';
        lines.push(`  async remove(id: ${toTsType(pkType)}${ctxWrite3}): Promise<void> {`);
        if (writeRoles) lines.push(`    assertRole(ctx, ${JSON.stringify(writeRoles)}, 'remove', '${entityName}');`);
        lines.push(`    const text = \\`DELETE FROM "${tableName}" WHERE "${pkName}" = $1\\`;`);
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
    }

    fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
    generated += 1;
  }

  await client.end();
  console.log(`Generated ${generated} DAL module file(s) from DB schema.`);
})().catch(err => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});

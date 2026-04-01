#!/usr/bin/env node
/**
 * Purpose: Generates SQL DDL and schema state snapshots (and alters on subsequent runs) from entity definitions.
 */
/**
 * Generate PostgreSQL DDL from entity JSON files.
 *
 * First run  → writes SQL/schema.sql + SQL/schema-state.json
 * Later runs → also writes SQL/alter-YYYY-MM-DD.sql with only the changes
 *
 * Usage:
 *   node tools/generate-sql.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');

const manager = ConfigurationManager.fromArgv(process.argv.slice(2), {
  cwd: path.join(__dirname, '..', '..'),
  defaultConfigPath: 'configuration.json',
});

// Load configuration
let cfg = { details: { paths: {} }, paths: {} };
try {
  cfg = manager.load();
} catch { /* use defaults */ }
const DOCS_ROOT = manager.getProjectRoot();
const P = (cfg.details && cfg.details.paths) || cfg.paths || {};

const ENTITIES_DIR = path.join(DOCS_ROOT, P['entities-dir']  || '2 Design/entities');
const SQL_DIR      = path.join(DOCS_ROOT, P['sql-dir']       || '3-SQL');
const STATE_FILE   = path.join(SQL_DIR, 'schema-state.json');
const SCHEMA_FILE  = path.join(SQL_DIR, 'schema.sql');

// ── Type mapping ──────────────────────────────────────────────────────────────
const TYPE_MAP = {
  'uuid':      'UUID',
  'string':    'VARCHAR(255)',
  'text':      'TEXT',
  'integer':   'INTEGER',
  'int':       'INTEGER',
  'boolean':   'BOOLEAN',
  'bool':      'BOOLEAN',
  'datetime':  'TIMESTAMPTZ',
  'date':      'DATE',
  'jsonb':     'JSONB',
  'object':    'JSONB',
  'decimal':   'NUMERIC',
  'number':    'NUMERIC',
  'float':     'NUMERIC',
  'string[]':  'TEXT[]',
  'enum':      'VARCHAR(50)',
};

function sqlType(field) {
  return TYPE_MAP[field.type] || 'TEXT';
}

// ── Name helpers ──────────────────────────────────────────────────────────────

/** ent-onboarding-instance → onboarding_instance */
function tableName(entityId) {
  return entityId.replace(/^ent-/, '').replace(/-/g, '_');
}

/** camelCase → snake_case */
function col(fieldName) {
  return fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// ── DDL builders ──────────────────────────────────────────────────────────────

function buildCreateTable(entity) {
  const tbl   = tableName(entity.entityId);
  const lines = [];
  const managed = entity.managedBy ? `, managedBy: ${entity.managedBy}` : '';
  lines.push(`-- ${entity.entityId}  (${entity.category}${managed})`);
  if (entity.description) lines.push(`-- ${entity.description}`);
  lines.push(`CREATE TABLE ${tbl} (`);

  const cols = [];
  for (const f of (entity.fields || [])) {
    const colDef = `  ${col(f.name).padEnd(28)} ${sqlType(f)}${f.required ? ' NOT NULL' : ''}${
      f.default !== undefined ? ` DEFAULT ${JSON.stringify(f.default)}` : ''
    }`;
    cols.push(f.description ? colDef + `  -- ${f.description}` : colDef);
  }

  const hasId = (entity.fields || []).some(f => f.name === 'id');
  if (hasId) cols.push(`  CONSTRAINT pk_${tbl} PRIMARY KEY (id)`);

  for (const f of (entity.fields || [])) {
    if (f.type === 'enum' && Array.isArray(f.enum)) {
      const vals = f.enum.map(v => `'${v}'`).join(', ');
      cols.push(`  CONSTRAINT chk_${tbl}_${col(f.name)} CHECK (${col(f.name)} IN (${vals}))`);
    }
  }

  lines.push(cols.join(',\n'));
  lines.push(');');
  return lines.join('\n');
}

function buildForeignKeys(entity, allTables) {
  const tbl   = tableName(entity.entityId);
  const stmts = [];
  for (const rel of (entity.relationships || [])) {
    if (rel.type !== 'belongs-to' && rel.type !== 'references') continue;
    const refTbl = tableName(rel.entity);
    if (!allTables.has(refTbl)) continue;
    const fkField = (entity.fields || []).find(f => f.name === rel.foreignKey);
    if (!fkField) continue;
    const fkCol = col(rel.foreignKey);
    stmts.push(
      `ALTER TABLE ${tbl}\n` +
      `  ADD CONSTRAINT fk_${tbl}_${fkCol}\n` +
      `  FOREIGN KEY (${fkCol}) REFERENCES ${refTbl} (id);`
    );
  }
  return stmts;
}

function buildIndexes(entity) {
  const tbl   = tableName(entity.entityId);
  const stmts = [];
  for (const idx of (entity.indexes || [])) {
    const cols    = idx.fields.map(col).join(', ');
    const unique  = idx.unique ? 'UNIQUE ' : '';
    const suffix  = idx.fields.map(col).join('_');
    const where   = idx.where ? idx.where.replace(/\b([a-z][a-zA-Z0-9]*)\b/g, m => col(m)) : null;
    let stmt = `CREATE ${unique}INDEX idx_${tbl}_${suffix} ON ${tbl} (${cols})`;
    if (where) stmt += `\n  WHERE ${where}`;
    stmt += ';';
    stmts.push(stmt);
  }
  return stmts;
}

// ── State capture (for diffing) ───────────────────────────────────────────────
function captureState(entities, allTables) {
  const state = { generatedAt: new Date().toISOString().slice(0, 10), tables: {} };
  for (const entity of entities) {
    const tbl = tableName(entity.entityId);
    const columns = (entity.fields || []).map(f =>
      `${col(f.name)} ${sqlType(f)}${f.required ? ' NOT NULL' : ''}${
        f.default !== undefined ? ` DEFAULT ${JSON.stringify(f.default)}` : ''
      }`
    );
    const fks = buildForeignKeys(entity, allTables).map(s => s.split('\n')[1].trim().replace(/^ADD CONSTRAINT /, ''));
    const idxs = buildIndexes(entity).map(s => s.split('\n')[0].replace(/;$/, ''));
    const checks = (entity.fields || [])
      .filter(f => f.type === 'enum' && f.enum)
      .map(f => `chk_${tbl}_${col(f.name)}`);
    state.tables[tbl] = { columns, fks, idxs, checks };
  }
  return state;
}

// ── Differ → ALTER SQL ────────────────────────────────────────────────────────
function buildAlter(oldState, newState) {
  const alters = [];
  const oldTables = new Set(Object.keys(oldState.tables));
  const newTables = new Set(Object.keys(newState.tables));

  // Dropped tables
  for (const tbl of oldTables) {
    if (!newTables.has(tbl)) {
      alters.push(`-- DROP TABLE ${tbl};  -- table removed (uncomment to apply)`);
    }
  }

  // New tables
  for (const tbl of newTables) {
    if (!oldTables.has(tbl)) {
      alters.push(`-- New table: ${tbl} — see schema.sql for full CREATE TABLE`);
    }
  }

  // Changed tables
  for (const tbl of newTables) {
    if (!oldTables.has(tbl)) continue;
    const oldT = oldState.tables[tbl];
    const newT = newState.tables[tbl];

    const oldCols = new Map(oldT.columns.map(c => [c.split(' ')[0], c]));
    const newCols = new Map(newT.columns.map(c => [c.split(' ')[0], c]));

    // Added columns
    for (const [name, def] of newCols) {
      if (!oldCols.has(name)) {
        const notNull = def.includes('NOT NULL') ? ' NOT NULL' : '';
        const defVal  = def.match(/DEFAULT (.+)$/)?.[1] || '';
        const type    = def.split(' ').slice(1).find(s => !['NOT', 'NULL', 'DEFAULT'].includes(s)) || 'TEXT';
        alters.push(`ALTER TABLE ${tbl} ADD COLUMN ${name} ${type}${notNull}${defVal ? ` DEFAULT ${defVal}` : ''};`);
      }
    }

    // Dropped columns
    for (const name of oldCols.keys()) {
      if (!newCols.has(name)) {
        alters.push(`-- ALTER TABLE ${tbl} DROP COLUMN ${name};  -- column removed (uncomment to apply)`);
      }
    }

    // Changed column types
    for (const [name, newDef] of newCols) {
      const oldDef = oldCols.get(name);
      if (oldDef && oldDef !== newDef) {
        const newType = newDef.split(' ').slice(1, 2).join(' ');
        alters.push(`ALTER TABLE ${tbl} ALTER COLUMN ${name} TYPE ${newType};`);
        if (newDef.includes('NOT NULL') && !oldDef.includes('NOT NULL'))
          alters.push(`ALTER TABLE ${tbl} ALTER COLUMN ${name} SET NOT NULL;`);
        if (!newDef.includes('NOT NULL') && oldDef.includes('NOT NULL'))
          alters.push(`ALTER TABLE ${tbl} ALTER COLUMN ${name} DROP NOT NULL;`);
      }
    }

    // New FKs
    const oldFKNames = new Set(oldT.fks.map(f => f.split(' ')[0]));
    const newFKNames = new Set(newT.fks.map(f => f.split(' ')[0]));
    for (const fk of newT.fks) {
      if (!oldFKNames.has(fk.split(' ')[0]))
        alters.push(`ALTER TABLE ${tbl} ADD CONSTRAINT ${fk};`);
    }
    for (const fk of oldT.fks) {
      if (!newFKNames.has(fk.split(' ')[0]))
        alters.push(`ALTER TABLE ${tbl} DROP CONSTRAINT ${fk.split(' ')[0]};`);
    }

    // New / dropped indexes
    const oldIdxSet = new Set(oldT.idxs);
    const newIdxSet = new Set(newT.idxs);
    for (const idx of newT.idxs) {
      if (!oldIdxSet.has(idx)) alters.push(idx + ';');
    }
    for (const idx of oldT.idxs) {
      if (!newIdxSet.has(idx)) {
        const idxName = idx.match(/INDEX (\S+)/)?.[1];
        if (idxName) alters.push(`DROP INDEX IF EXISTS ${idxName};`);
      }
    }
  }

  return alters;
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(SQL_DIR)) fs.mkdirSync(SQL_DIR, { recursive: true });

const files = fs.readdirSync(ENTITIES_DIR)
  .filter(f => /^ent-.*\.json$/.test(f)).sort();

const entities = files.map(f => {
  try { return JSON.parse(fs.readFileSync(path.join(ENTITIES_DIR, f), 'utf8')); }
  catch (e) { process.stderr.write(`Skipping ${f}: ${e.message}\n`); return null; }
}).filter(Boolean);

const allTables = new Set(entities.map(e => tableName(e.entityId)));
const today = new Date().toISOString().slice(0, 10);

// ── Build schema.sql ──────────────────────────────────────────────────────────
const out = [];
out.push('-- ============================================================');
out.push('-- Employee Onboarding Platform — Database Schema');
out.push(`-- Generated : ${today}`);
out.push(`-- Source    : sample/entities/ (${entities.length} entities)`);
out.push('-- Target    : PostgreSQL 15+');
out.push('-- ============================================================\n');

out.push('-- ============================================================\n-- 1. TABLES\n-- ============================================================\n');
for (const entity of entities) { out.push(buildCreateTable(entity)); out.push(''); }

const allFKs = entities.flatMap(e => buildForeignKeys(e, allTables));
if (allFKs.length) {
  out.push('-- ============================================================\n-- 2. FOREIGN KEY CONSTRAINTS\n-- ============================================================\n');
  out.push(allFKs.join('\n\n'));
  out.push('');
}

const allIdxs = entities.flatMap(e => buildIndexes(e));
if (allIdxs.length) {
  out.push('-- ============================================================\n-- 3. INDEXES\n-- ============================================================\n');
  out.push(allIdxs.join('\n'));
  out.push('');
}

fs.writeFileSync(SCHEMA_FILE, out.join('\n'));
console.log(`Written: SQL/schema.sql`);

// ── Build alter.sql if baseline exists ───────────────────────────────────────
const newState = captureState(entities, allTables);

if (fs.existsSync(STATE_FILE)) {
  const oldState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const alters   = buildAlter(oldState, newState);

  if (alters.length === 0) {
    console.log('No schema changes detected — alter.sql not written.');
  } else {
    const alterFile = path.join(SQL_DIR, `alter-${today}.sql`);
    const alterOut  = [
      '-- ============================================================',
      `-- Schema changes from ${oldState.generatedAt} → ${today}`,
      '-- ============================================================\n',
      ...alters,
      '',
    ];
    fs.writeFileSync(alterFile, alterOut.join('\n'));
    console.log(`Written: SQL/alter-${today}.sql  (${alters.length} statements)`);
  }
} else {
  console.log('No baseline found — this is the initial snapshot (no alter.sql generated).');
}

// Update baseline
fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2));
console.log('Updated: SQL/schema-state.json');

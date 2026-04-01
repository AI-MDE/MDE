#!/usr/bin/env node
/**
 * Purpose: Cross-validates commands, skills, orchestrator, catalog/view references, and project configuration consistency.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

const STRICT = argv.includes('--strict');
const JSON_OUTPUT = argv.includes('--json');

const MDE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = getArgValue('--project')
  ? path.resolve(getArgValue('--project'))
  : process.cwd();

const COMMANDS_DIR = path.join(MDE_ROOT, 'ai-instructions', 'commands');
const SKILLS_DIR = path.join(MDE_ROOT, 'ai-instructions', 'skills');
const ORCH_FILE = path.join(MDE_ROOT, 'ai-instructions', 'orchestrator.json');
const METHODOLOGY = path.join(MDE_ROOT, 'methodology', 'methodology.json');
const CATALOG_FILE = path.join(MDE_ROOT, 'methodology', 'document-catalog.json');
const VIEW_JSON = path.join(MDE_ROOT, 'web', 'view.json');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'configuration.json');
const SCHEMA_FILE = path.join(MDE_ROOT, 'schemas', 'configuration.schema.json');

class Reporter {
  constructor() {
    this.errors = 0;
    this.warnings = 0;
    this.records = [];
  }

  section(title) {
    if (!JSON_OUTPUT) console.log(`\n== ${title} ==`);
  }

  ok(message, meta = {}) {
    this.records.push({ level: 'ok', message, ...meta });
    if (!JSON_OUTPUT) console.log(`  [OK]    ${message}`);
  }

  warn(message, meta = {}) {
    this.warnings += 1;
    this.records.push({ level: 'warn', message, ...meta });
    if (!JSON_OUTPUT) console.warn(`  [WARN]  ${message}`);
  }

  err(message, meta = {}) {
    this.errors += 1;
    this.records.push({ level: 'error', message, ...meta });
    if (!JSON_OUTPUT) console.error(`  [ERROR] ${message}`);
  }
}

const report = new Reporter();

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (err) {
    report.err(`Failed to parse ${path.relative(MDE_ROOT, filePath)}: ${err.message}`);
    return null;
  }
}

function walkJsonFiles(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      report.err(`Unable to read directory ${path.relative(MDE_ROOT, current)}: ${err.message}`);
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(abs);
    }
  }
  return files.sort();
}

function createRegistry(rootDir, kind) {
  const files = walkJsonFiles(rootDir);
  const entries = [];
  const aliasMap = new Map();
  const primaryMap = new Map();

  for (const file of files) {
    const data = readJson(file);
    if (!data) continue;

    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    const relNoExt = rel.replace(/\.json$/i, '');
    const base = path.basename(file, '.json');
    const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : relNoExt;

    const entry = { kind, file, rel, relNoExt, base, name, data };
    entries.push(entry);

    if (!primaryMap.has(name)) primaryMap.set(name, []);
    primaryMap.get(name).push(entry);

    const aliases = new Set([name, relNoExt, base]);
    for (const alias of aliases) {
      if (!aliasMap.has(alias)) aliasMap.set(alias, []);
      aliasMap.get(alias).push(entry);
    }
  }

  for (const [key, list] of primaryMap.entries()) {
    if (list.length > 1) {
      report.err(
        `Duplicate ${kind} name "${key}" declared in: ${list.map((e) => e.rel).join(', ')}. Use unique names or namespaced references.`,
      );
    }
  }

  function resolve(ref) {
    const direct = aliasMap.get(ref) || [];
    if (direct.length === 1) return { entry: direct[0] };
    if (direct.length > 1) return { ambiguous: direct };

    if (!ref.includes('/')) {
      const suffixMatches = entries.filter((e) => e.relNoExt.endsWith(`/${ref}`));
      if (suffixMatches.length === 1) return { entry: suffixMatches[0] };
      if (suffixMatches.length > 1) return { ambiguous: suffixMatches };
    }

    return { entry: null };
  }

  return { entries, resolve };
}

function getConfigValue(config, keyPath) {
  return keyPath.split('.').reduce((obj, key) => {
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
    return undefined;
  }, config);
}

function extractConfigRefs(obj, refs = new Set()) {
  if (typeof obj === 'string') {
    const matches = obj.match(/\$config\.([a-zA-Z0-9_.]+)/g);
    if (matches) matches.forEach((m) => refs.add(m.replace('$config.', '')));
    return refs;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => extractConfigRefs(item, refs));
    return refs;
  }
  if (obj && typeof obj === 'object') {
    Object.values(obj).forEach((v) => extractConfigRefs(v, refs));
  }
  return refs;
}

function resolveRef(value, config) {
  return value.replace(/\$config\.([a-zA-Z0-9_.]+)/g, (orig, dotPath) => {
    const resolved = getConfigValue(config, dotPath);
    return typeof resolved === 'string' ? resolved : orig;
  });
}

function toFsPath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') return inputPath;
  const normalized = inputPath.replace(/\\/g, '/');

  // Already absolute Windows path.
  if (/^[A-Za-z]:\//.test(normalized)) {
    return path.normalize(normalized);
  }

  // Virtual absolute path used by MDE configs (e.g. /dev/leaveManagement/...).
  if (normalized.startsWith('/dev/')) {
    const driveRoot = path.parse(PROJECT_ROOT).root || process.cwd().slice(0, 3);
    const rel = normalized.slice('/dev/'.length).split('/');
    return path.join(driveRoot, 'dev', ...rel);
  }

  // Other absolute paths.
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }

  // Relative to project root.
  return path.join(PROJECT_ROOT, inputPath);
}

function validateSchema(value, schema, atPath) {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      report.err(`${atPath}: expected object`);
      return;
    }
    for (const req of schema.required || []) {
      if (value[req] === undefined) report.err(`${atPath}: missing required field "${req}"`);
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!schema.properties[key]) {
          if (STRICT) report.err(`${atPath}: unexpected field "${key}"`);
          else report.warn(`${atPath}: unexpected field "${key}"`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (value[key] !== undefined) validateSchema(value[key], subSchema, `${atPath}.${key}`);
      }
    }
    return;
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      report.err(`${atPath}: expected string, got ${typeof value}`);
      return;
    }
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      report.err(`${atPath}: value "${value}" does not match pattern ${schema.pattern}`);
    }
  }
}

function collectDocTypes(item, types) {
  if (!item || typeof item !== 'object') return;
  if (item.docType) types.add(item.docType);
  for (const child of item.items || []) collectDocTypes(child, types);
}

function checkViewItemFiles(item, sampleConfig, catalogById) {
  if (item.items) {
    item.items.forEach((child) => checkViewItemFiles(child, sampleConfig, catalogById));
    return;
  }
  if (item.scan || !item.file) return;

  const resolved = resolveRef(item.file, sampleConfig);
  if (resolved.includes('$config')) {
    report.warn(`${item.id}: unresolved $config reference in "${item.file}"`);
    return;
  }

  const absPath = toFsPath(resolved);
  const optional = Boolean(
    item.includeIfExists || (catalogById[item.docType] && catalogById[item.docType].status !== 'required'),
  );

  if (fs.existsSync(absPath)) {
    report.ok(`${item.id}: ${resolved}`);
  } else if (optional) {
    report.warn(`${item.id}: optional file missing - ${resolved}`);
  } else {
    report.err(`${item.id}: required file missing - ${resolved}`);
  }
}

report.section('Loading Inputs');
const orchestrator = readJson(ORCH_FILE);
const methodology = readJson(METHODOLOGY);
const viewJson = readJson(VIEW_JSON);
const catalogData = readJson(CATALOG_FILE);
const sampleConfig = fs.existsSync(CONFIG_FILE) ? readJson(CONFIG_FILE) : null;
const schema = fs.existsSync(SCHEMA_FILE) ? readJson(SCHEMA_FILE) : null;

const commandRegistry = createRegistry(COMMANDS_DIR, 'command');
const skillRegistry = createRegistry(SKILLS_DIR, 'skill');

if (!sampleConfig) report.warn(`configuration.json not found at ${CONFIG_FILE}; skipping configuration-backed checks`);
if (!orchestrator) process.exit(1);

const catalogById = {};
if (catalogData && Array.isArray(catalogData.document_types)) {
  for (const dt of catalogData.document_types) catalogById[dt.id] = dt;
}

report.section('1) Orchestrator phase commands exist');
const orchPhaseForCommand = new Map();
for (const [phase, rules] of Object.entries(orchestrator.phase_rules || {})) {
  if (phase.startsWith('_')) continue;
  for (const commandRef of rules.allowed_commands || []) {
    const resolved = commandRegistry.resolve(commandRef);
    if (resolved.ambiguous) {
      report.err(`${phase} -> command "${commandRef}" is ambiguous: ${resolved.ambiguous.map((e) => e.relNoExt).join(', ')}`);
      continue;
    }
    if (!resolved.entry) {
      report.err(`${phase} -> command "${commandRef}" not found in commands/`);
      continue;
    }
    const commandName = resolved.entry.name;
    if (orchPhaseForCommand.has(commandName) && orchPhaseForCommand.get(commandName) !== phase) {
      report.err(`command "${commandName}" appears in multiple orchestrator phases: ${orchPhaseForCommand.get(commandName)} and ${phase}`);
    } else {
      orchPhaseForCommand.set(commandName, phase);
      report.ok(`${phase} -> command "${commandRef}" resolved as ${resolved.entry.relNoExt}`);
    }
  }
}

report.section('2) Command phase matches orchestrator');
for (const entry of commandRegistry.entries) {
  const cmd = entry.data || {};
  const orchPhase = orchPhaseForCommand.get(entry.name);
  if (!orchPhase) {
    report.warn(`command "${entry.name}" (${entry.relNoExt}) is not listed in any orchestrator phase`);
    continue;
  }
  if (cmd.phase && cmd.phase !== orchPhase) {
    report.err(`command "${entry.name}" declares phase "${cmd.phase}" but orchestrator phase is "${orchPhase}"`);
  } else {
    report.ok(`command "${entry.name}" phase matches orchestrator (${orchPhase})`);
  }
}

report.section('3) Command skill references exist');
const referencedSkills = new Set();
for (const entry of commandRegistry.entries) {
  const cmd = entry.data || {};
  const calls = Array.isArray(cmd.calls) ? cmd.calls : [];
  if (calls.length === 0) {
    const tools = Array.isArray(cmd.tools) ? cmd.tools : [];
    if (tools.length === 0) {
      report.warn(`command "${entry.name}" has neither skills (calls) nor tools defined`);
    } else {
      report.ok(`command "${entry.name}" is tool-only (no skill calls)`);
    }
    continue;
  }
  for (const skillRef of calls) {
    const resolved = skillRegistry.resolve(skillRef);
    if (resolved.ambiguous) {
      report.err(`command "${entry.name}" -> skill "${skillRef}" is ambiguous: ${resolved.ambiguous.map((e) => e.relNoExt).join(', ')}`);
      continue;
    }
    if (!resolved.entry) {
      report.err(`command "${entry.name}" -> skill "${skillRef}" not found in skills/`);
      continue;
    }
    referencedSkills.add(resolved.entry.name);
    report.ok(`command "${entry.name}" -> skill "${skillRef}" resolved as ${resolved.entry.relNoExt}`);
  }
}

report.section('4) Orphan skills');
for (const entry of skillRegistry.entries) {
  if (!referencedSkills.has(entry.name)) {
    report.warn(`skill "${entry.name}" (${entry.relNoExt}) is not called by any command`);
  } else {
    report.ok(`skill "${entry.name}" is referenced`);
  }
}

if (methodology && viewJson) {
  report.section('5) view.json phases match methodology');
  const methPhases = new Set((methodology.phases || []).map((p) => p.name));
  const docsPhases = (viewJson.sections || []).filter((s) => s.phase).map((s) => s.phase);

  for (const phase of docsPhases) {
    if (methPhases.has(phase)) report.ok(`view.json section phase "${phase}" exists in methodology`);
    else report.err(`view.json section phase "${phase}" not found in methodology.json`);
  }
  for (const phase of methPhases) {
    if (!docsPhases.includes(phase)) report.warn(`methodology phase "${phase}" has no matching section in view.json`);
  }
}

if (viewJson && sampleConfig) {
  report.section('6) view.json $config keys exist in configuration.json');
  const refs = extractConfigRefs(viewJson);
  for (const ref of [...refs].sort()) {
    const val = getConfigValue(sampleConfig, ref);
    if (val !== undefined) report.ok(`$config.${ref} = "${val}"`);
    else report.err(`$config.${ref} not found in configuration.json`);
  }
}

if (sampleConfig && schema) {
  report.section('7) configuration.json schema validation');
  const before = report.errors;
  validateSchema(sampleConfig, schema, 'root');
  if (report.errors === before) report.ok('configuration.json is valid against configuration.schema.json');
}

if (viewJson && catalogData) {
  report.section('8) Document catalog coverage');
  const usedDocTypes = new Set();
  for (const section of viewJson.sections || []) collectDocTypes(section, usedDocTypes);

  for (const dt of [...usedDocTypes].sort()) {
    if (catalogById[dt]) report.ok(`docType "${dt}" is registered in document-catalog.json`);
    else report.warn(`docType "${dt}" used in view.json but not found in document-catalog.json`);
  }
  for (const id of Object.keys(catalogById).sort()) {
    if (!usedDocTypes.has(id)) report.warn(`catalog entry "${id}" is not referenced by any view.json section`);
  }
}

if (viewJson && sampleConfig) {
  report.section('9) Project document files exist on disk');
  for (const section of viewJson.sections || []) {
    for (const item of section.items || []) checkViewItemFiles(item, sampleConfig, catalogById);
  }
}

const effectiveErrors = report.errors + (STRICT ? report.warnings : 0);
const exitCode = effectiveErrors > 0 ? 1 : 0;

if (JSON_OUTPUT) {
  process.stdout.write(JSON.stringify({
    strict: STRICT,
    errors: report.errors,
    warnings: report.warnings,
    effectiveErrors,
    exitCode,
    records: report.records,
  }, null, 2));
  process.stdout.write('\n');
} else {
  console.log('\n========================================');
  console.log(`Errors:   ${report.errors}`);
  console.log(`Warnings: ${report.warnings}`);
  if (STRICT) console.log(`Strict mode: ON (warnings count as errors)`);
  console.log(`Exit:     ${exitCode === 0 ? 'PASS' : 'FAIL'}`);
  console.log('========================================\n');
}

process.exit(exitCode);


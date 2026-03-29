#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const MDE_ROOT     = path.resolve(__dirname, '..');
const PROJECT_ROOT = process.argv.find(a => a.startsWith('--project='))
  ? path.resolve(process.argv.find(a => a.startsWith('--project=')).replace('--project=', ''))
  : process.cwd();

const COMMANDS_DIR  = path.join(MDE_ROOT, 'ai-instructions', 'commands');
const SKILLS_DIR    = path.join(MDE_ROOT, 'ai-instructions', 'skills');
const ORCH_FILE     = path.join(MDE_ROOT, 'ai-instructions', 'orchestrator.json');
const METHODOLOGY   = path.join(MDE_ROOT, 'methodology', 'methodology.json');
const CATALOG_FILE  = path.join(MDE_ROOT, 'methodology', 'document-catalog.json');
const VIEW_JSON     = path.join(MDE_ROOT, 'web', 'view.json');
const CONFIG_FILE   = path.join(PROJECT_ROOT, 'configuration.json');

// Use ROOT for relative display in messages
const ROOT = MDE_ROOT;

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  [ERROR]   ${msg}`); errors++; }
function warn(msg) { console.warn (`  [WARN]    ${msg}`); warnings++; }
function ok(msg)   { console.log  (`  [OK]      ${msg}`); }

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    err(`Failed to parse ${path.relative(ROOT, file)}: ${e.message}`);
    return null;
  }
}

function loadDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .reduce((map, f) => {
      const data = loadJson(path.join(dir, f));
      if (data) map[data.name || path.basename(f, '.json')] = data;
      return map;
    }, {});
}

// ── Load ─────────────────────────────────────────────────────────────────────
console.log('\nLoading orchestrator...');
const orch = loadJson(ORCH_FILE);
if (!orch) process.exit(1);

console.log('Loading commands...');
const commands = loadDir(COMMANDS_DIR);

console.log('Loading skills...');
const skills = loadDir(SKILLS_DIR);

console.log('Loading methodology...');
const methodology = loadJson(METHODOLOGY);

console.log('Loading view.json...');
const viewJson = loadJson(VIEW_JSON);

console.log('Loading document-catalog.json...');
const catalogData = loadJson(CATALOG_FILE);
const catalogById = {};
if (catalogData) {
  for (const dt of (catalogData.document_types || [])) catalogById[dt.id] = dt;
}

console.log(`Loading configuration from: ${CONFIG_FILE}`);
const sampleConfig = fs.existsSync(CONFIG_FILE) ? loadJson(CONFIG_FILE) : null;
if (!sampleConfig) warn(`configuration.json not found at ${CONFIG_FILE} — skipping $config checks (use --project=<path>)`);

// ── 1. Orchestrator phase_rules → commands ───────────────────────────────────
console.log('\n── 1. Orchestrator phase commands exist ──');
const phaseRules = orch.phase_rules || {};
for (const [phase, rules] of Object.entries(phaseRules)) {
  if (phase.startsWith('_')) continue;
  for (const cmd of (rules.allowed_commands || [])) {
    if (commands[cmd]) {
      ok(`${phase} → command "${cmd}" exists`);
    } else {
      err(`${phase} → command "${cmd}" not found in commands/`);
    }
  }
}

// ── 2. Command.phase matches orchestrator phase ───────────────────────────────
console.log('\n── 2. Command phase matches orchestrator ──');
const orchPhaseForCommand = {};
for (const [phase, rules] of Object.entries(phaseRules)) {
  if (phase.startsWith('_')) continue;
  for (const cmd of (rules.allowed_commands || [])) {
    orchPhaseForCommand[cmd] = phase;
  }
}

for (const [name, cmd] of Object.entries(commands)) {
  const orchPhase = orchPhaseForCommand[name];
  if (!orchPhase) {
    warn(`command "${name}" is not listed in any orchestrator phase`);
  } else if (cmd.phase && cmd.phase !== orchPhase) {
    err(`command "${name}" declares phase "${cmd.phase}" but orchestrator puts it in "${orchPhase}"`);
  } else {
    ok(`command "${name}" phase matches orchestrator (${orchPhase})`);
  }
}

// ── 3. Command.calls → skills exist ──────────────────────────────────────────
console.log('\n── 3. Command skill references exist ──');
for (const [name, cmd] of Object.entries(commands)) {
  for (const skill of (cmd.calls || [])) {
    if (skills[skill]) {
      ok(`command "${name}" → skill "${skill}" exists`);
    } else {
      err(`command "${name}" → skill "${skill}" not found in skills/`);
    }
  }
  if (!cmd.calls || cmd.calls.length === 0) {
    warn(`command "${name}" has no skills (calls is empty)`);
  }
}

// ── 4. Skills referenced by commands vs all skills ───────────────────────────
console.log('\n── 4. Orphan skills (not called by any command) ──');
const referencedSkills = new Set(
  Object.values(commands).flatMap(c => c.calls || [])
);
for (const skill of Object.keys(skills)) {
  if (!referencedSkills.has(skill)) {
    warn(`skill "${skill}" is not called by any command`);
  } else {
    ok(`skill "${skill}" is referenced`);
  }
}

// ── 5. view.json phases match methodology.json phases ────────────────────────
console.log('\n── 5. view.json phases match methodology.json ──');
if (methodology && viewJson) {
  const methPhases = new Set((methodology.phases || []).map(p => p.name));
  const docsPhases = (viewJson.sections || []).filter(s => s.phase).map(s => s.phase);

  for (const phase of docsPhases) {
    if (methPhases.has(phase)) {
      ok(`view.json section phase "${phase}" exists in methodology`);
    } else {
      err(`view.json section phase "${phase}" not found in methodology.json`);
    }
  }

  for (const phase of methPhases) {
    if (!docsPhases.includes(phase)) {
      warn(`methodology phase "${phase}" has no matching section in view.json`);
    }
  }
}

// ── 6. view.json $config.* keys exist in configuration.json ──────────────────
console.log('\n── 6. view.json $config keys exist in configuration.json ──');
if (viewJson && sampleConfig) {
  // Collect all $config.x.y references from view.json recursively
  function extractConfigRefs(obj, refs = new Set()) {
    if (typeof obj === 'string') {
      const matches = obj.match(/\$config\.([a-zA-Z0-9_.]+)/g);
      if (matches) matches.forEach(m => refs.add(m.replace('$config.', '')));
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractConfigRefs(item, refs));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(v => extractConfigRefs(v, refs));
    }
    return refs;
  }

  function getConfigValue(config, keyPath) {
    return keyPath.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), config);
  }

  const refs = extractConfigRefs(viewJson);
  for (const ref of [...refs].sort()) {
    const val = getConfigValue(sampleConfig, ref);
    if (val !== undefined) {
      ok(`$config.${ref} = "${val}"`);
    } else {
      err(`$config.${ref} not found in configuration.json`);
    }
  }
}

// ── 7. configuration.json validates against schema ───────────────────────────
console.log('\n── 7. configuration.json schema validation ──');
if (sampleConfig) {
  const schemaFile = path.join(MDE_ROOT, 'schemas', 'configuration.schema.json');
  const schema = loadJson(schemaFile);
  if (schema) {
    function validateSchema(obj, schema, pathStr = 'root') {
      if (schema.type === 'object') {
        if (typeof obj !== 'object' || Array.isArray(obj) || obj === null) {
          err(`${pathStr}: expected object`); return;
        }
        for (const key of (schema.required || [])) {
          if (obj[key] === undefined) err(`${pathStr}: missing required field "${key}"`);
        }
        if (schema.additionalProperties === false && schema.properties) {
          for (const key of Object.keys(obj)) {
            if (!schema.properties[key]) err(`${pathStr}: unexpected field "${key}"`);
          }
        }
        if (schema.properties) {
          for (const [key, subSchema] of Object.entries(schema.properties)) {
            if (obj[key] !== undefined) validateSchema(obj[key], subSchema, `${pathStr}.${key}`);
          }
        }
      } else if (schema.type === 'string') {
        if (typeof obj !== 'string') err(`${pathStr}: expected string, got ${typeof obj}`);
        else if (schema.pattern && !new RegExp(schema.pattern).test(obj))
          err(`${pathStr}: value "${obj}" does not match pattern ${schema.pattern}`);
      }
    }
    const prevErrors = errors;
    validateSchema(sampleConfig, schema);
    if (errors === prevErrors) ok(`configuration.json is valid against configuration.schema.json`);
  }
}

// ── 8. Document catalog coverage — every docType in view.json is in catalog ───
console.log('\n── 8. Document catalog coverage ──');
if (viewJson && catalogData) {
  // Collect all docType values used in view.json (recurse through items/scan)
  function collectDocTypes(obj, types = new Set()) {
    if (!obj || typeof obj !== 'object') return types;
    if (obj.docType) types.add(obj.docType);
    for (const child of (obj.items || [])) collectDocTypes(child, types);
    return types;
  }
  const usedDocTypes = new Set();
  for (const section of (viewJson.sections || [])) {
    collectDocTypes(section, usedDocTypes);
  }

  for (const dt of [...usedDocTypes].sort()) {
    if (catalogById[dt]) {
      ok(`docType "${dt}" is registered in document-catalog.json`);
    } else {
      warn(`docType "${dt}" used in view.json but not found in document-catalog.json`);
    }
  }

  // Reverse: catalog entries with no matching docType in view.json
  for (const id of Object.keys(catalogById).sort()) {
    if (!usedDocTypes.has(id)) {
      warn(`catalog entry "${id}" is not referenced by any view.json section`);
    }
  }
}

// ── 9. Project document files exist on disk ────────────────────────────────────
console.log('\n── 9. Project document files exist on disk ──');
if (sampleConfig && viewJson) {
  function resolveRef(value, config) {
    return value.replace(/\$config\.([a-zA-Z0-9_.]+)/g, (orig, dotPath) => {
      const val = dotPath.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), config);
      return typeof val === 'string' ? val : orig;
    });
  }

  function checkItem(item) {
    if (item.items) { item.items.forEach(checkItem); return; }
    if (item.scan)  return; // scan dirs checked separately
    if (!item.file) return;

    const resolved = resolveRef(item.file, sampleConfig);
    if (resolved.includes('$config')) {
      warn(`${item.id}: unresolved $config ref in file "${item.file}"`);
      return;
    }

    const abs = path.join(PROJECT_ROOT, resolved);
    const optional = item.includeIfExists ||
      (catalogById[item.docType] && catalogById[item.docType].status !== 'required');

    if (fs.existsSync(abs)) {
      ok(`${item.id}: ${resolved}`);
    } else if (optional) {
      warn(`${item.id}: optional file missing — ${resolved}`);
    } else {
      err(`${item.id}: required file missing — ${resolved}`);
    }
  }

  for (const section of (viewJson.sections || [])) {
    for (const item of (section.items || [])) checkItem(item);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
if (errors === 0 && warnings === 0) {
  console.log('All checks passed.');
} else {
  if (errors)   console.error(`${errors} error(s) found.`);
  if (warnings) console.warn (`${warnings} warning(s) found.`);
}
console.log('');
process.exit(errors > 0 ? 1 : 0);

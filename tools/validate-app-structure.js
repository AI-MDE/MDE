#!/usr/bin/env node
'use strict';

/**
 * validate-app-structure.js
 * Validates a project's physical structure against the MDE meta layout:
 *
 *   1.  configuration.json folders exist on disk
 *   2.  Required artifacts exist per current project phase (from project-state.json)
 *   3.  Naming conventions: ent-*.json, module-*.json, uc-*.md
 *   4.  Entity files are valid JSON with required fields
 *   5.  Module spec files are valid JSON and match module-catalog.json
 *   6.  Use-case files have a title front-matter field
 *   7.  Module catalog references: every moduleId in module-catalog has a spec file
 *   8.  Entity references: every entityRef in module-catalog has an ent-*.json file
 *   9.  No orphan entity files (entity not listed in module-catalog)
 *  10.  LDM entities cross-check against ent-*.json files
 *
 * Usage:
 *   node tools/validate-app-structure.js --project=<path>
 */

const fs   = require('fs');
const path = require('path');

const PROJECT_ROOT = process.argv.find(a => a.startsWith('--project='))
  ? path.resolve(process.argv.find(a => a.startsWith('--project=')).replace('--project=', ''))
  : process.cwd();

const CONFIG_FILE = path.join(PROJECT_ROOT, 'configuration.json');

let errors = 0, warnings = 0;
function err(msg)  { console.error(`  [ERROR] ${msg}`); errors++;   }
function warn(msg) { console.warn (`  [WARN]  ${msg}`); warnings++; }
function ok(msg)   { console.log  (`  [OK]    ${msg}`); }

function loadJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    err(`${label}: failed to parse — ${e.message}`);
    return null;
  }
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }

function resolve(configPath) {
  if (!configPath) return null;
  return path.isAbsolute(configPath)
    ? configPath
    : path.join(PROJECT_ROOT, configPath);
}

// ── Load configuration ────────────────────────────────────────────────────────
console.log(`\nProject: ${PROJECT_ROOT}`);
console.log(`Config:  ${CONFIG_FILE}\n`);

if (!fs.existsSync(CONFIG_FILE)) {
  err(`configuration.json not found at ${CONFIG_FILE}`);
  process.exit(1);
}
const config = loadJson(CONFIG_FILE, 'configuration.json');
if (!config) process.exit(1);

function cfg(dotPath) {
  return dotPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), config);
}

// ── 1. Configuration folders exist ───────────────────────────────────────────
console.log('── 1. Configuration folder paths exist ──');
const FOLDER_PATHS = [
  'ba.discovery', 'ba.analyzed', 'ba.useCases',
  'design.entities', 'design.modules', 'design.sql',
  'output.src',
];
for (const dotPath of FOLDER_PATHS) {
  const val = cfg(dotPath);
  if (!val) { warn(`config.${dotPath} not set`); continue; }
  const abs = resolve(val);
  if (fs.existsSync(abs)) ok(`config.${dotPath} → ${val}`);
  else warn(`config.${dotPath} folder missing — ${val}`);
}

// ── 2. Required artifacts per phase ──────────────────────────────────────────
console.log('\n── 2. Required artifacts per current phase ──');
const stateFile = resolve(cfg('project_state.state'));
const projectState = stateFile && fs.existsSync(stateFile) ? loadJson(stateFile, 'project-state') : null;
const currentPhase = projectState?.current_phase || 'unknown';
console.log(`  Current phase: ${currentPhase}`);

const REQUIRED_BY_PHASE = {
  project_initiation: [
    { label: 'application definition', path: cfg('application.definition') },
  ],
  business_analysis: [
    { label: 'requirements',      path: cfg('ba.requirements') },
    { label: 'analysis status',   path: cfg('ba.analysisStatus') },
    { label: 'business functions',path: cfg('ba.businessFunctions') },
  ],
  system_design: [
    { label: 'requirements',        path: cfg('ba.requirements') },
    { label: 'business functions',  path: cfg('ba.businessFunctions') },
    { label: 'application architecture', path: cfg('design.appArchitecture') },
    { label: 'module catalog',      path: cfg('design.moduleCatalog') },
  ],
  development: [
    { label: 'module catalog',      path: cfg('design.moduleCatalog') },
    { label: 'application architecture', path: cfg('design.appArchitecture') },
  ],
  governance: [
    { label: 'requirements',        path: cfg('ba.requirements') },
    { label: 'module catalog',      path: cfg('design.moduleCatalog') },
    { label: 'project state',       path: cfg('project_state.state') },
  ],
};

const phasesToCheck = currentPhase === 'unknown'
  ? Object.keys(REQUIRED_BY_PHASE)
  : Object.keys(REQUIRED_BY_PHASE).filter(p =>
      Object.keys(REQUIRED_BY_PHASE).indexOf(p) <=
      Object.keys(REQUIRED_BY_PHASE).indexOf(currentPhase)
    );

for (const phase of phasesToCheck) {
  for (const { label, path: relPath } of (REQUIRED_BY_PHASE[phase] || [])) {
    if (!relPath) { warn(`${phase}/${label}: config path not set`); continue; }
    const abs = resolve(relPath);
    if (fs.existsSync(abs)) ok(`${phase}/${label} — ${relPath}`);
    else err(`${phase}/${label} missing — ${relPath}`);
  }
}

// ── 3. Naming conventions ─────────────────────────────────────────────────────
console.log('\n── 3. Naming conventions ──');

// Entities: ent-*.json
const entitiesDir = resolve(cfg('design.entities'));
let entityFiles = [];
if (entitiesDir && fs.existsSync(entitiesDir)) {
  entityFiles = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.json'));
  const badEnt = entityFiles.filter(f => !/^ent-[a-z][a-z0-9-]*\.json$/.test(f));
  badEnt.forEach(f => err(`entity file "${f}" violates naming convention — expected ent-{kebab-name}.json`));
  if (!badEnt.length) ok(`${entityFiles.length} entity file(s) follow ent-*.json convention`);
} else {
  warn(`entities folder not found — ${cfg('design.entities')}`);
}

// Module specs: module-*.json (inside type subdirs)
const modulesDir = resolve(cfg('design.modules'));
let moduleSpecFiles = [];
if (modulesDir && fs.existsSync(modulesDir)) {
  // Walk one level of subdirectories
  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDir = path.join(modulesDir, entry.name);
      fs.readdirSync(subDir)
        .filter(f => f.endsWith('.json'))
        .forEach(f => moduleSpecFiles.push({ dir: entry.name, file: f, abs: path.join(subDir, f) }));
    }
  }
  const badMod = moduleSpecFiles.filter(({ file }) => !/^module-[a-z][a-z0-9-]*\.json$/.test(file));
  badMod.forEach(({ file, dir }) =>
    err(`module spec "${dir}/${file}" violates naming convention — expected module-{kebab-name}.json`)
  );
  const goodMod = moduleSpecFiles.filter(({ file }) => /^module-[a-z][a-z0-9-]*\.json$/.test(file));
  if (!badMod.length && goodMod.length) ok(`${goodMod.length} module spec file(s) follow module-*.json convention`);
} else {
  warn(`modules folder not found — ${cfg('design.modules')}`);
}

// Use cases: uc-*.md
const useCasesDir = resolve(cfg('ba.useCases'));
let useCaseFiles = [];
if (useCasesDir && fs.existsSync(useCasesDir)) {
  useCaseFiles = fs.readdirSync(useCasesDir).filter(f => f.endsWith('.md'));
  const badUc = useCaseFiles.filter(f => !/^uc-\d+.*\.md$/.test(f));
  badUc.forEach(f => err(`use-case file "${f}" violates naming convention — expected uc-{number}-{name}.md`));
  if (!badUc.length && useCaseFiles.length) ok(`${useCaseFiles.length} use-case file(s) follow uc-*.md convention`);
  else if (!useCaseFiles.length) warn(`no use-case files found in ${cfg('ba.useCases')}`);
} else {
  warn(`use-cases folder not found — ${cfg('ba.useCases')}`);
}

// ── 4. Entity files: valid JSON with required fields ──────────────────────────
console.log('\n── 4. Entity file structure ──');
const ENTITY_REQUIRED = ['id', 'name'];
for (const f of entityFiles) {
  const abs = path.join(entitiesDir, f);
  const raw = loadJson(abs, f);
  if (!raw) continue;
  // Support both { id, name, ... } and { entity: { id, name, ... } }
  const data = raw.entity || raw;
  const missing = ENTITY_REQUIRED.filter(k => !data[k]);
  if (missing.length) err(`${f}: missing required fields — ${missing.join(', ')}`);
  else ok(`${f}: id="${data.id}", name="${data.name}"`);
}

// ── 5. Module catalog: every module has a spec file ───────────────────────────
console.log('\n── 5. Module catalog → spec file coverage ──');
const catalogFile = resolve(cfg('design.moduleCatalog'));
let catalog = null;
if (catalogFile && fs.existsSync(catalogFile)) {
  catalog = loadJson(catalogFile, 'module-catalog.json');
}

// Build flat list of all module-*.json files across all subdirs for lookup
const allModuleSpecFiles = new Map(); // basename → abs path
if (modulesDir && fs.existsSync(modulesDir)) {
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (/^module-[a-z].*\.json$/.test(e.name)) {
        allModuleSpecFiles.set(e.name, path.join(dir, e.name));
      }
    });
  })(modulesDir);
}

// Pre-parse spec files for ID-based fallback lookup
const specFileById = new Map(); // moduleId → abs path
for (const [, absPath] of allModuleSpecFiles) {
  try {
    const spec = loadJson(absPath, path.basename(absPath));
    const specId = spec && (spec.moduleId || spec.id);
    if (specId) specFileById.set(specId, absPath);
  } catch (_) {}
}

if (catalog) {
  const modules = catalog.modules || (catalog.catalog && catalog.catalog.modules) || [];
  for (const mod of modules) {
    const modId   = mod.moduleId || mod.id || '';
    const modName = mod.moduleName || mod.name || '';
    // Try name-based match first
    const kebab = modName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const expectedFile = `module-${kebab}.json`;
    const foundByName = allModuleSpecFiles.has(expectedFile)
      ? allModuleSpecFiles.get(expectedFile)
      : [...allModuleSpecFiles.values()].find(p => path.basename(p) === expectedFile);
    if (foundByName) {
      ok(`${modId} → ${rel(foundByName)}`);
    } else {
      // Fallback: match by moduleId inside the spec file
      const foundById = specFileById.get(modId);
      if (foundById) {
        warn(`${modId} (${modName}): spec file name mismatch — found by ID at ${rel(foundById)}`);
      } else {
        warn(`${modId} (${modName}): no spec file matching module-${kebab}.json and no spec with id="${modId}"`);
      }
    }
  }
} else {
  warn(`module-catalog.json not found or invalid — skipping spec coverage check`);
}

// ── 6. Use-case files have a title ────────────────────────────────────────────
console.log('\n── 6. Use-case file titles ──');
for (const f of useCaseFiles) {
  const abs = path.join(useCasesDir, f);
  const content = fs.readFileSync(abs, 'utf8');
  const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/^title:\s*(.+)/im);
  if (titleMatch) ok(`${f}: "${titleMatch[1].trim()}"`);
  else warn(`${f}: no title found (expected # heading or title: front-matter)`);
}

// ── 7. Module catalog entity IDs → entity files exist ────────────────────────
console.log('\n── 7. Module catalog entity IDs → entity files ──');
// Build entity ID → file map from entity files
const entityIdToFile = {};
for (const f of entityFiles) {
  const raw = loadJson(path.join(entitiesDir, f), f);
  if (!raw) continue;
  const data = raw.entity || raw;
  if (data.id) entityIdToFile[data.id] = f;
}

if (catalog) {
  const modules = catalog.modules || (catalog.catalog && catalog.catalog.modules) || [];
  for (const mod of modules) {
    // entities may be array of IDs or a single entityRef path
    const entityIds = mod.entities || (mod.entityRef ? [mod.entityRef] : []);
    if (!entityIds.length) { ok(`${mod.moduleId || mod.id}: no entities listed`); continue; }
    for (const eid of entityIds) {
      if (entityIdToFile[eid]) ok(`${mod.moduleId || mod.id}: entity ${eid} → ${entityIdToFile[eid]}`);
      else err(`${mod.moduleId || mod.id}: entity "${eid}" not found in any ent-*.json file`);
    }
  }
}

// ── 8. Orphan entity files (entity ID not referenced by any module) ───────────
console.log('\n── 8. Orphan entity files ──');
if (catalog && entityFiles.length) {
  const modules = catalog.modules || (catalog.catalog && catalog.catalog.modules) || [];
  const referencedEntityIds = new Set(
    modules.flatMap(m => m.entities || (m.entityRef ? [m.entityRef] : []))
  );
  for (const [eid, f] of Object.entries(entityIdToFile)) {
    if (referencedEntityIds.has(eid)) ok(`${f} (${eid}): referenced by module catalog`);
    else warn(`${f} (${eid}): not referenced by any module in module-catalog.json`);
  }
}

// ── 9. LDM entities cross-check ───────────────────────────────────────────────
console.log('\n── 9. LDM entities vs entity files ──');
const ldmDir   = resolve(cfg('design.ldm'));
const ldmFile  = ldmDir ? path.join(ldmDir, 'logical-data-model.json') : null;
if (ldmFile && fs.existsSync(ldmFile)) {
  const ldm = loadJson(ldmFile, 'logical-data-model.json');
  if (ldm) {
    const ldmEntities = (ldm.entities || []).map(e => e.name || e.id).filter(Boolean);
    const entNames    = new Set(entityFiles.map(f => f.replace(/^ent-/, '').replace(/\.json$/, '')));

    // Convert PascalCase or spaces to kebab: "LeaveType" → "leave-type"
    function toKebab(name) {
      return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase split
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .replace(/^-|-$/g, '');
    }

    for (const name of ldmEntities) {
      const kebab = toKebab(name);
      if (entNames.has(kebab)) ok(`LDM entity "${name}" → ent-${kebab}.json`);
      else warn(`LDM entity "${name}" has no matching ent-${kebab}.json`);
    }
    for (const entFile of entityFiles) {
      const kebab = entFile.replace(/^ent-/, '').replace(/\.json$/, '');
      const inLdm = ldmEntities.some(n => toKebab(n) === kebab);
      if (!inLdm) warn(`ent-${kebab}.json has no matching entity in LDM`);
    }
  }
} else {
  warn(`logical-data-model.json not found — ${ldmFile ? rel(ldmFile) : 'path not configured'}`);
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

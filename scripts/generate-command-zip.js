/**
 * generate-command-zip.js
 *
 * Packages all inputs for a command into a zip you can attach to ChatGPT (or any AI)
 * and say "follow command.txt".
 *
 * Usage:
 *   node mde/scripts/generate-command-zip.js "Generate Modules"
 *   node mde/scripts/generate-command-zip.js generate_modules
 *   node mde/scripts/generate-command-zip.js          ← prompts for command
 *
 * Output:
 *   output/commands/{command-name}.zip
 *     command.txt          ← AI prompt with full task instructions
 *     <all resolved input files at their project-relative paths>
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');
const os            = require('os');

// ─── Paths & config ───────────────────────────────────────────────────────────

const ROOT         = process.cwd();
const CONFIG_FILE  = path.join(ROOT, 'configuration.json');
const CONFIG       = (() => {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
})();

const COMMANDS_DIR = path.resolve(ROOT, CONFIG.mde?.commands || 'mde/ai-instructions/commands');
const SKILLS_DIR   = path.resolve(ROOT, CONFIG.mde?.skills   || 'mde/ai-instructions/skills');
const OUT_DIR      = path.join(ROOT, CONFIG.output?.commands || 'output/commands');

// MDE tool root — derived from commands dir or explicit config.mde.path
const MDE_DIR = CONFIG.mde?.path
  ? path.resolve(CONFIG.mde.path)
  : path.resolve(path.join(COMMANDS_DIR, '../..'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Resolve "config.design.entityPattern" by walking CONFIG.
 * Returns the string value or null if not found.
 */
function resolveConfigRef(ref) {
  if (!ref || !ref.startsWith('config.')) return null;
  const keys = ref.slice('config.'.length).split('.');
  let node = CONFIG;
  for (const k of keys) {
    if (node == null || typeof node !== 'object') return null;
    node = node[k];
  }
  return typeof node === 'string' ? node : null;
}

/**
 * Given an input entry — either a plain string or { from, pattern?, default } —
 * return the resolved path string (may include a glob pattern).
 */
function resolveInputEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const base = resolveConfigRef(entry.from);
    if (entry.pattern) {
      // Combine resolved base directory with the glob pattern
      const dir = base || (entry.default ? path.dirname(entry.default) : null);
      return dir ? dir.replace(/\\/g, '/').replace(/\/$/, '') + '/' + entry.pattern : null;
    }
    return base || entry.default || null;
  }
  return null;
}

/**
 * Resolve a project-root-relative pattern (may contain *) to absolute paths.
 */
function resolvePattern(pattern) {
  const base = path.resolve(ROOT, pattern);

  if (!base.includes('*')) {
    try { return fs.statSync(base).isFile() ? [base] : []; } catch { return []; }
  }

  const parts   = base.replace(/\\/g, '/').split('/');
  const starIdx = parts.findIndex(p => p.includes('*'));
  const dir     = parts.slice(0, starIdx).join('/');
  const glob    = parts[starIdx];
  const rest    = parts.slice(starIdx + 1).join('/');
  const re      = new RegExp('^' + glob.replace(/\./g, '\\.').replace('*', '.*') + '$');

  if (!fileExists(dir)) return [];

  const matched = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!re.test(entry)) continue;
    const candidate = rest ? path.join(dir, entry, rest) : path.join(dir, entry);
    try { if (fs.statSync(candidate).isFile()) matched.push(candidate); } catch { /* skip */ }
  }
  return matched.sort();
}

/**
 * Collect files from the MDE tool itself (architecture, methodology, root docs).
 * Returns { abs, rel } pairs where rel is the path to use inside the zip.
 */
function collectMdeContextFiles() {
  const results = [];

  function addDir(absDir, zipPrefix) {
    if (!fileExists(absDir)) return;
    for (const name of fs.readdirSync(absDir)) {
      const abs = path.join(absDir, name);
      if (fs.statSync(abs).isFile()) {
        results.push({ abs, rel: zipPrefix + name });
      }
    }
  }

  // architecture/ — rules and constraints the AI must follow
  const archDir = CONFIG.mde?.architecture
    ? path.resolve(ROOT, CONFIG.mde.architecture)
    : path.join(MDE_DIR, 'architecture');
  addDir(archDir, 'mde/architecture/');

  // methodology/ — document-catalog.json, methodology.json, etc.
  const methDir = CONFIG.mde?.methodology
    ? path.resolve(ROOT, CONFIG.mde.methodology)
    : path.join(MDE_DIR, 'methodology');
  addDir(methDir, 'mde/methodology/');

  // MDE root context docs
  for (const name of ['AGENT.md', 'GEMINI.md', 'README.md', 'changes.md']) {
    const abs = path.join(MDE_DIR, name);
    if (fileExists(abs)) results.push({ abs, rel: 'mde/' + name });
  }

  return results;
}

/** Collect and deduplicate all input files for a command + its skills. */
function collectInputs(command, skills) {
  const seen     = new Set();
  const files    = [];   // { abs, rel } — project-rooted files
  const mdeFiles = collectMdeContextFiles();

  function add(absPath) {
    const norm = absPath.replace(/\\/g, '/');
    if (!seen.has(norm)) {
      seen.add(norm);
      files.push({ abs: absPath, rel: path.relative(ROOT, absPath).replace(/\\/g, '/') });
    }
  }

  // Always include the command and skill definition files themselves
  add(path.join(COMMANDS_DIR, `${command.name}.json`));
  for (const skill of skills) {
    add(path.join(SKILLS_DIR, `${skill.name}.json`));
  }

  // Command requires — array of strings OR { key: { from, default } } object
  const reqEntries = Array.isArray(command.requires)
    ? command.requires
    : Object.values(command.requires || {});
  for (const entry of reqEntries) {
    const pattern = resolveInputEntry(entry);
    if (pattern) for (const f of resolvePattern(pattern)) add(f);
  }

  // Skill inputs — array of strings OR { key: { from, pattern?, default } } object
  for (const skill of skills) {
    const inputs  = skill.inputs || [];
    const entries = Array.isArray(inputs) ? inputs : Object.values(inputs);
    for (const entry of entries) {
      const pattern = resolveInputEntry(entry);
      if (pattern) {
        for (const f of resolvePattern(pattern)) add(f);
      }
    }
  }

  // Merge MDE context files (deduplicate by rel path)
  const seenRel = new Set(files.map(f => f.rel));
  for (const f of mdeFiles) {
    if (!seenRel.has(f.rel)) { seenRel.add(f.rel); files.push(f); }
  }

  return files;
}

/**
 * Resolve skill outputs to a flat list of path strings.
 * Handles both old array format and new { key: { to, pattern } } object.
 */
function resolveOutputs(skill) {
  const o = skill.outputs || [];
  if (Array.isArray(o)) return o;
  return Object.values(o).map(v => {
    const base = resolveConfigRef(v.to) || v.to || '';
    return base ? `${base}/${v.pattern}` : v.pattern;
  });
}

/** Build the command.txt prompt string. */
function buildPrompt(command, skills, inputFiles /* { abs, rel }[] */) {
  const lines = [];

  lines.push('# AI Command Prompt');
  lines.push('');
  lines.push(`Command  : ${command.label || command.name}`);
  lines.push(`Canonical: ${command.name}`);
  lines.push(`Phase    : ${command.phase || '—'}`);
  lines.push('');

  for (const skill of skills) {
    lines.push(`## Skill: ${skill.name}`);
    lines.push('');
    lines.push(`**Purpose:** ${skill.purpose}`);
    lines.push('');
  }

  const toArray = (v) => !v ? [] : Array.isArray(v) ? v : Object.values(v);

  const allRules = [
    ...toArray(command.rules),
    ...skills.flatMap(s => toArray(s.rules)),
  ];
  if (allRules.length) {
    lines.push('## Rules');
    lines.push('');
    for (const r of allRules) lines.push(`- ${r}`);
    lines.push('');
  }

  const produces = [
    ...toArray(command.produces),
    ...skills.flatMap(resolveOutputs),
  ];
  const uniqueProduces = [...new Set(produces)];
  if (uniqueProduces.length) {
    lines.push('## Expected Outputs');
    lines.push('');
    for (const p of uniqueProduces) lines.push(`- ${p}`);
    lines.push('');
  }

  lines.push('## Input Files Included');
  lines.push('');
  for (const f of inputFiles) {
    lines.push(`- ${f.rel}`);
  }
  lines.push('');

  lines.push('## Instruction');
  lines.push('');
  lines.push(
    'All input files are attached. Execute the command following the rules above. ' +
    'Write outputs to the paths listed under Expected Outputs. ' +
    'Do not invent requirements not present in the input files.'
  );
  lines.push('');

  return lines.join('\n');
}


/** Stage files + command.txt into a temp folder, then zip it. */
function createZip(command, prompt, inputFiles /* { abs, rel }[] */) {
  const zipName    = command.name.replace(/_/g, '-');
  const staging    = fs.mkdtempSync(path.join(os.tmpdir(), `mde-${zipName}-`));
  const zipOutPath = path.join(OUT_DIR, `${zipName}.zip`);

  try {
    fs.writeFileSync(path.join(staging, 'command.txt'), prompt, 'utf8');

    for (const { abs, rel } of inputFiles) {
      const dest = path.join(staging, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(abs, dest);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (fileExists(zipOutPath)) fs.unlinkSync(zipOutPath);

    if (os.platform() === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipOutPath}' -Force"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(`cd "${staging}" && zip -r "${zipOutPath}" .`, { stdio: 'pipe', shell: true });
    }

    return zipOutPath;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const commands = fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return readJson(path.join(COMMANDS_DIR, f)); } catch { return null; } })
    .filter(c => c && c.name && !c.deprecated);

  console.log(`\nBuilding zips for ${commands.length} command(s)...\n`);
  for (const cmd of commands) {
    buildCommandZip(cmd);
  }
  console.log('\nDone.\n');
}

function buildCommandZip(command) {
  console.log(`\nCommand : ${command.label || command.name}`);

  const skills = [];
  const callsList = Array.isArray(command.calls) ? command.calls : Object.values(command.calls || {});
  for (const skillName of callsList) {
    const skillPath = path.join(SKILLS_DIR, `${skillName}.json`);
    if (!fileExists(skillPath)) { console.warn(`  WARN skill not found: ${skillName}`); return; }
    skills.push(readJson(skillPath));
    console.log(`  Skill : ${skillName}`);
  }

  const inputFiles = collectInputs(command, skills);
  console.log(`  Files : ${inputFiles.length} input file(s)`);
  for (const f of inputFiles) {
    console.log(`    + ${f.rel}`);
  }

  const prompt  = buildPrompt(command, skills, inputFiles);
  const zipPath = createZip(command, prompt, inputFiles);
  const relZip  = path.relative(ROOT, zipPath).replace(/\\/g, '/');

  console.log(`  Output: ${relZip}`);
}

try { main(); } catch (err) { console.error(err.message); process.exit(1); }

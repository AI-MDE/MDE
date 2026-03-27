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
const readline      = require('readline');
const { execSync }  = require('child_process');
const os            = require('os');

// ─── Paths & config ───────────────────────────────────────────────────────────

const ROOT         = path.join(__dirname, '../..');
const CONFIG_FILE  = path.join(ROOT, 'configuration.json');
const CONFIG       = (() => {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
})();

const COMMANDS_DIR = path.join(ROOT, CONFIG.mde?.commands || 'mde/ai-instructions/commands');
const SKILLS_DIR   = path.join(ROOT, CONFIG.mde?.skills   || 'mde/ai-instructions/skills');
const OUT_DIR      = path.join(ROOT, CONFIG.output?.commands || 'output/commands');

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
 * Given an input entry — either a plain string or { from, default } —
 * return the resolved path string.
 */
function resolveInputEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    return resolveConfigRef(entry.from) || entry.default || null;
  }
  return null;
}

/**
 * Resolve a project-root-relative pattern (may contain *) to absolute paths.
 */
function resolvePattern(pattern) {
  const base = path.resolve(ROOT, pattern);

  if (!base.includes('*')) {
    return fileExists(base) ? [base] : [];
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
    if (fileExists(candidate)) matched.push(candidate);
  }
  return matched.sort();
}

/** Collect and deduplicate all input files for a command + its skills. */
function collectInputs(command, skills) {
  const seen  = new Set();
  const files = [];

  function add(absPath) {
    const norm = absPath.replace(/\\/g, '/');
    if (!seen.has(norm)) { seen.add(norm); files.push(absPath); }
  }

  // Always include the command and skill definition files themselves
  add(path.join(COMMANDS_DIR, `${command.name}.json`));
  for (const skill of skills) {
    add(path.join(SKILLS_DIR, `${skill.name}.json`));
  }

  // Command requires[] — always an array of plain strings
  for (const pattern of (command.requires || [])) {
    for (const f of resolvePattern(pattern)) add(f);
  }

  // Skill inputs — array of strings OR { key: { from, default } } object
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
function buildPrompt(command, skills, inputFiles) {
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

  const allRules = [
    ...(command.rules || []),
    ...skills.flatMap(s => s.rules || []),
  ];
  if (allRules.length) {
    lines.push('## Rules');
    lines.push('');
    for (const r of allRules) lines.push(`- ${r}`);
    lines.push('');
  }

  const produces = [
    ...(command.produces || []),
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
    lines.push(`- ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
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

/** Find a command JSON by name or label (case-insensitive). */
function findCommand(query) {
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.json'));
  const q     = query.toLowerCase().replace(/[-_ ]/g, '');

  for (const file of files) {
    const cmd = readJson(path.join(COMMANDS_DIR, file));
    const nameNorm  = (cmd.name  || '').toLowerCase().replace(/[-_ ]/g, '');
    const labelNorm = (cmd.label || '').toLowerCase().replace(/[-_ ]/g, '');
    if (nameNorm === q || labelNorm === q) return cmd;
  }
  return null;
}

/** Stage files + command.txt into a temp folder, then zip it. */
function createZip(command, prompt, inputFiles) {
  const zipName    = command.name.replace(/_/g, '-');
  const staging    = fs.mkdtempSync(path.join(os.tmpdir(), `mde-${zipName}-`));
  const zipOutPath = path.join(OUT_DIR, `${zipName}.zip`);

  try {
    fs.writeFileSync(path.join(staging, 'command.txt'), prompt, 'utf8');

    for (const absFile of inputFiles) {
      const rel  = path.relative(ROOT, absFile);
      const dest = path.join(staging, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(absFile, dest);
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

async function main() {
  let query = process.argv[2];

  if (!query) {
    const available = fs.readdirSync(COMMANDS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return readJson(path.join(COMMANDS_DIR, f)); } catch { return null; } })
      .filter(c => c && c.name && !c.deprecated)
      .map(c => `  ${c.name.padEnd(35)} ${c.label || ''}`)
      .join('\n');

    console.log('\nAvailable commands:\n');
    console.log(available);
    console.log('');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    query = await new Promise(resolve => rl.question('Command name or label: ', ans => {
      rl.close();
      resolve(ans.trim());
    }));
  }

  if (!query) { console.error('No command specified.'); process.exit(1); }

  const command = findCommand(query);
  if (!command) { console.error(`Command not found: "${query}"`); process.exit(1); }
  if (command.deprecated) {
    console.error(`Command "${command.name}" is deprecated. Use: ${command.replacedBy}`);
    process.exit(1);
  }

  console.log(`\nCommand : ${command.label || command.name}`);

  const skills = [];
  for (const skillName of (command.calls || [])) {
    const skillPath = path.join(SKILLS_DIR, `${skillName}.json`);
    if (!fileExists(skillPath)) { console.warn(`  WARN skill not found: ${skillName}`); continue; }
    skills.push(readJson(skillPath));
    console.log(`  Skill : ${skillName}`);
  }

  const inputFiles = collectInputs(command, skills);
  console.log(`  Files : ${inputFiles.length} input file(s)`);
  for (const f of inputFiles) {
    console.log(`    + ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
  }

  const prompt  = buildPrompt(command, skills, inputFiles);
  const zipPath = createZip(command, prompt, inputFiles);
  const relZip  = path.relative(ROOT, zipPath).replace(/\\/g, '/');

  console.log(`\nOutput  : ${relZip}`);
  console.log('\nAttach the zip to ChatGPT and say:');
  console.log('  "Follow command.txt"\n');
}

main().catch(err => { console.error(err.message); process.exit(1); });

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ConfigurationManager } = require('../lib/config-manager');

function getArgValue(args, name) {
  const prefix = `${name}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function toRegexFromGlob(globPatternAbs) {
  const normalized = normalizeSlashes(globPatternAbs);
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexBody = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${regexBody}$`, 'i');
}

function walkFilesRecursive(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        results.push(abs);
      }
    }
  }
  return results;
}

function resolveGlob(patternRel, baseDir) {
  const absPattern = path.resolve(baseDir, patternRel);
  const normalizedPattern = normalizeSlashes(absPattern);
  const hasWildcard = /[*?]/.test(normalizedPattern);
  if (!hasWildcard) {
    return fs.existsSync(absPattern) && fs.statSync(absPattern).isFile() ? [absPattern] : [];
  }

  const parts = normalizedPattern.split('/');
  const baseParts = [];
  for (const part of parts) {
    if (part.includes('*') || part.includes('?')) break;
    baseParts.push(part);
  }
  const basePath = baseParts.length > 0 ? baseParts.join('/') : normalizeSlashes(path.parse(normalizedPattern).root);
  const baseDirNative = basePath.replace(/\//g, path.sep);
  if (!fs.existsSync(baseDirNative)) return [];

  const regex = toRegexFromGlob(absPattern);
  return walkFilesRecursive(baseDirNative)
    .filter((filePath) => regex.test(normalizeSlashes(filePath)));
}

function safeJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function psQuoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildPromptText(skillName, skill, commandNames, includedFiles, missingPatterns, projectRoot) {
  const lines = [];
  lines.push(`Skill Debug Prompt`);
  lines.push(`Skill: ${skillName}`);
  lines.push(`GeneratedAt: ${new Date().toISOString()}`);
  lines.push('');
  if (skill && skill.purpose) lines.push(`Purpose: ${skill.purpose}`);
  if (Array.isArray(commandNames) && commandNames.length > 0) {
    lines.push(`MappedCommands: ${commandNames.join(', ')}`);
  }
  lines.push('');
  lines.push('Input Files Included:');
  if (includedFiles.length === 0) {
    lines.push('- (none)');
  } else {
    includedFiles.forEach((p) => lines.push(`- ${normalizeSlashes(path.relative(projectRoot, p))}`));
  }
  lines.push('');
  lines.push('Missing Input Patterns:');
  if (missingPatterns.length === 0) {
    lines.push('- (none)');
  } else {
    missingPatterns.forEach((p) => lines.push(`- ${p}`));
  }
  lines.push('');
  lines.push('AI Task Prompt');
  lines.push('You are executing the following skill in this workspace.');
  lines.push(`Skill Name: ${skillName}`);
  if (skill && skill.purpose) lines.push(`Objective: ${skill.purpose}`);
  if (Array.isArray(skill && skill.methodology) && skill.methodology.length > 0) {
    lines.push('');
    lines.push('Methodology:');
    skill.methodology.forEach((m) => lines.push(`- ${m}`));
  }
  if (Array.isArray(skill && skill.rules) && skill.rules.length > 0) {
    lines.push('');
    lines.push('Rules:');
    skill.rules.forEach((r) => lines.push(`- ${r}`));
  }
  if (Array.isArray(skill && skill.constraints) && skill.constraints.length > 0) {
    lines.push('');
    lines.push('Constraints:');
    skill.constraints.forEach((c) => lines.push(`- ${c}`));
  }
  if (Array.isArray(skill && skill.outputs) && skill.outputs.length > 0) {
    lines.push('');
    lines.push('Expected Outputs:');
    skill.outputs.forEach((o) => lines.push(`- ${o}`));
  }
  lines.push('');
  lines.push('Use the included input files as your evidence base and produce outputs exactly at the expected paths.');
  return lines.join('\n') + '\n';
}

function bundleSkill({
  skillArg,
  skillFile,
  skill,
  manager,
  cfg,
  projectRoot,
  aiInstructionsDir,
  commandsDir,
}) {
  const skillDir = path.dirname(skillFile);
  const inputPatterns = []
    .concat(Array.isArray(skill.inputs) ? skill.inputs : [])
    .concat(Array.isArray(skill.optional_inputs) ? skill.optional_inputs : []);

  const foundFiles = new Set();
  const missingPatterns = [];
  inputPatterns.forEach((patternRel) => {
    if (typeof patternRel !== 'string' || !patternRel.trim()) return;
    const baseDirs = [skillDir, aiInstructionsDir, projectRoot];
    const matchSet = new Set();
    baseDirs.forEach((baseDir) => {
      resolveGlob(patternRel, baseDir).forEach((m) => matchSet.add(path.resolve(m)));
    });
    const matches = Array.from(matchSet);
    if (matches.length === 0) {
      missingPatterns.push(patternRel);
      return;
    }
    matches.forEach((m) => foundFiles.add(path.resolve(m)));
  });

  const includedFiles = Array.from(foundFiles).sort((a, b) => a.localeCompare(b));
  const commandNames = [];
  if (fs.existsSync(commandsDir)) {
    fs.readdirSync(commandsDir)
      .filter((f) => /\.json$/i.test(f))
      .forEach((f) => {
        const cmd = safeJson(path.join(commandsDir, f));
        if (cmd && cmd.skill === skillArg && typeof cmd.name === 'string') {
          commandNames.push(cmd.name);
        }
      });
  }

  const debugDir = path.join(projectRoot, 'debug', skillArg);
  const inputsDir = path.join(debugDir, 'inputs');
  fs.rmSync(debugDir, { recursive: true, force: true });
  ensureDir(inputsDir);

  includedFiles.forEach((srcAbs) => {
    const rel = normalizeSlashes(path.relative(projectRoot, srcAbs));
    const dest = path.join(inputsDir, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(srcAbs, dest);
  });

  const promptText = buildPromptText(skillArg, skill, commandNames, includedFiles, missingPatterns, projectRoot);
  const promptPath = path.join(debugDir, 'ai-prompt.txt');
  fs.writeFileSync(promptPath, promptText, 'utf8');

  const manifest = {
    skill: skillArg,
    generatedAt: new Date().toISOString(),
    config: path.relative(projectRoot, manager.getConfigPath()).replace(/\\/g, '/'),
    commandMappings: commandNames,
    inputs: {
      declaredPatterns: inputPatterns,
      includedFiles: includedFiles.map((p) => normalizeSlashes(path.relative(projectRoot, p))),
      missingPatterns,
    },
    outputPaths: {
      debugDir: normalizeSlashes(path.relative(projectRoot, debugDir)),
      prompt: normalizeSlashes(path.relative(projectRoot, promptPath)),
      zip: normalizeSlashes(path.relative(projectRoot, path.join(debugDir, 'inputs.zip'))),
    },
    project: cfg && cfg['Project-Name'] ? cfg['Project-Name'] : null,
  };
  const manifestPath = path.join(debugDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const zipPath = path.join(debugDir, 'inputs.zip');
  const psCmd = [
    '$ErrorActionPreference = "Stop"',
    `if (Test-Path ${psQuoteLiteral(zipPath)}) { Remove-Item -LiteralPath ${psQuoteLiteral(zipPath)} -Force }`,
    `Compress-Archive -Path ${psQuoteLiteral(path.join(inputsDir, '*'))} -DestinationPath ${psQuoteLiteral(zipPath)} -Force`,
  ].join('; ');
  const zipRun = spawnSync('powershell', ['-NoProfile', '-Command', psCmd], { cwd: projectRoot, encoding: 'utf8' });
  if (zipRun.status !== 0) {
    console.warn(`[WARN] Failed to create ZIP archive for ${skillArg}.`);
    if (zipRun.stderr) console.warn(zipRun.stderr.trim());
  }

  console.log(`Debug bundle created: ${path.relative(projectRoot, debugDir)}`);
  console.log(`Prompt: ${path.relative(projectRoot, promptPath)}`);
  console.log(`Manifest: ${path.relative(projectRoot, manifestPath)}`);
  if (fs.existsSync(zipPath)) {
    console.log(`Zip: ${path.relative(projectRoot, zipPath)}`);
  } else {
    console.log('Zip: not created');
  }
  console.log(`Included files: ${includedFiles.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  return { skill: skillArg, included: includedFiles.length, missing: missingPatterns.length };
}

function main() {
  const argv = process.argv.slice(2);
  const allMode = argv.includes('--all');
  const skillArg = getArgValue(argv, '--skill') || argv[0];
  if (!allMode && !skillArg) {
    console.error('Usage: node mde/tools/build-skill-debug-bundle.js --skill=<skill_name> [--all] [--config=configuration.json]');
    process.exit(1);
  }

  const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'configuration.json' });
  let cfg;
  try {
    cfg = manager.load();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }

  const projectRoot = manager.getProjectRoot();
  const skillsDir = path.join(projectRoot, 'mde', 'ai-instructions', 'skills');
  const aiInstructionsDir = path.join(projectRoot, 'mde', 'ai-instructions');
  const commandsDir = path.join(projectRoot, 'mde', 'ai-instructions', 'commands');
  const skillsToProcess = allMode
    ? fs.readdirSync(skillsDir)
        .filter((f) => /\.json$/i.test(f))
        .map((f) => ({ name: f.replace(/\.json$/i, ''), file: path.join(skillsDir, f) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [{ name: skillArg, file: path.join(skillsDir, `${skillArg}.json`) }];

  const summary = [];
  for (const item of skillsToProcess) {
    if (!fs.existsSync(item.file)) {
      console.warn(`[WARN] Skill file not found: ${item.file}`);
      continue;
    }
    const skill = safeJson(item.file);
    if (!skill) {
      console.warn(`[WARN] Failed to parse skill JSON: ${item.file}`);
      continue;
    }
    const result = bundleSkill({
      skillArg: item.name,
      skillFile: item.file,
      skill,
      manager,
      cfg,
      projectRoot,
      aiInstructionsDir,
      commandsDir,
    });
    summary.push(result);
    if (allMode) console.log('---');
  }

  if (allMode) {
    const total = summary.length;
    const withMissing = summary.filter((x) => x.missing > 0).length;
    console.log(`All skills processed: ${total}`);
    console.log(`Skills with missing input patterns: ${withMissing}`);
  }
}

main();

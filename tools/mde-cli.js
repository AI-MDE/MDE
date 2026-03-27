#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ConfigurationManager } = require('./lib/config-manager');

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/mde\s+/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function loadCommandRegistry(commandsDir) {
  if (!fs.existsSync(commandsDir)) return [];
  return fs.readdirSync(commandsDir)
    .filter((f) => /\.json$/i.test(f))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(commandsDir, f), 'utf8').replace(/^\uFEFF/, ''));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function resolveCommand(inputText, commands) {
  const target = normalize(inputText);
  if (!target) return null;
  const byName = commands.find((c) => normalize(c.name) === target);
  if (byName) return byName;
  const byLabel = commands.find((c) => normalize(c.label) === target);
  if (byLabel) return byLabel;
  return commands.find((c) => normalize(c.name).includes(target) || normalize(c.label).includes(target)) || null;
}

function runNodeScript(scriptPath, args, cwd) {
  const run = spawnSync(process.execPath, [scriptPath, ...args], { cwd, stdio: 'inherit' });
  return typeof run.status === 'number' ? run.status : 1;
}

function main() {
  const argv = process.argv.slice(2);
  const configArg = argv.find((a) => a.startsWith('--config='));
  const modelArg = argv.find((a) => a.startsWith('--model='));
  const maxFilesArg = argv.find((a) => a.startsWith('--max-files='));
  const maxBytesArg = argv.find((a) => a.startsWith('--max-file-bytes='));
  const args = argv.filter((a) => !a.startsWith('--config=') && !a.startsWith('--model=') && !a.startsWith('--max-files=') && !a.startsWith('--max-file-bytes='));

  const manager = ConfigurationManager.fromArgv(configArg ? [configArg] : [], { defaultConfigPath: 'configuration.json' });
  let cfg;
  try {
    cfg = manager.load();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }
  const projectRoot = manager.getProjectRoot();
  const commandsDir = path.join(projectRoot, 'mde', 'ai-instructions', 'commands');
  const toolsDir = path.join(projectRoot, 'mde', 'tools');
  const commands = loadCommandRegistry(commandsDir);

  const first = (args[0] || '').toLowerCase();
  if (!args.length || first === 'help' || first === '/mde') {
    console.log('Usage: node mde/tools/mde-cli.js <command> [--config=configuration.json] [--model=gpt-5]');
    console.log('       node mde/tools/mde-cli.js list');
    process.exit(0);
  }

  if (first === 'list' || (args[0] === '/mde' && (args[1] || '').toLowerCase() === 'list')) {
    commands
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((c) => {
        console.log(`${c.name} | ai=${c.ai || 'none'} | skill=${c.skill || '-'} | label=${c.label || c.name}`);
      });
    process.exit(0);
  }

  const commandText = args[0] === '/mde' ? args.slice(1).join(' ') : args.join(' ');
  const command = resolveCommand(commandText, commands);
  if (!command) {
    console.error(`[ERROR] Command not found: ${commandText}`);
    process.exit(1);
  }

  const aiMode = String(command.ai || 'none').toLowerCase();
  if (aiMode === 'required') {
    if (!command.skill) {
      console.error(`[ERROR] Command '${command.name}' is ai:required but has no skill.`);
      process.exit(1);
    }
    const apiRunner = path.join(toolsDir, 'run-skill-api.js');
    const runArgs = [
      `--skill=${command.skill}`,
      `--config=${path.relative(projectRoot, manager.getConfigPath()).replace(/\\/g, '/')}`,
    ];
    if (modelArg) runArgs.push(modelArg);
    if (maxFilesArg) runArgs.push(maxFilesArg);
    if (maxBytesArg) runArgs.push(maxBytesArg);
    const code = runNodeScript(apiRunner, runArgs, projectRoot);
    process.exit(code);
  }

  const candidates = [
    `${command.name}.js`,
    `${command.name.replace(/_/g, '-')}.js`,
  ];
  const toolFile = candidates.map((f) => path.join(toolsDir, f)).find((p) => fs.existsSync(p));
  if (!toolFile) {
    if (command.skill) {
      const apiRunner = path.join(toolsDir, 'run-skill-api.js');
      const runArgs = [
        `--skill=${command.skill}`,
        `--config=${path.relative(projectRoot, manager.getConfigPath()).replace(/\\/g, '/')}`,
      ];
      if (modelArg) runArgs.push(modelArg);
      if (maxFilesArg) runArgs.push(maxFilesArg);
      if (maxBytesArg) runArgs.push(maxBytesArg);
      const code = runNodeScript(apiRunner, runArgs, projectRoot);
      process.exit(code);
    }
    console.error(`[ERROR] No tool script found for command '${command.name}'.`);
    process.exit(1);
  }

  const code = runNodeScript(toolFile, [`--config=${path.relative(projectRoot, manager.getConfigPath()).replace(/\\/g, '/')}`], projectRoot);
  process.exit(code);
}

main();

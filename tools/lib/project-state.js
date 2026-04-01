/**
 * Purpose: Provides helpers to read/update project state and command-log artifacts consistently.
 */
const fs = require('fs');
const path = require('path');

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizePhase(value) {
  if (!value) return 'business_analysis';
  return String(value).trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function addUnique(arr, value) {
  if (!arr.includes(value)) arr.push(value);
}

function buildCommandLabelMap(commandsRegistryPath) {
  const map = new Map();
  let commands = [];
  try {
    const stats = fs.existsSync(commandsRegistryPath) ? fs.statSync(commandsRegistryPath) : null;
    if (stats && stats.isDirectory()) {
      commands = fs.readdirSync(commandsRegistryPath)
        .filter((name) => /\.json$/i.test(name))
        .map((name) => safeReadJson(path.join(commandsRegistryPath, name), null))
        .filter(Boolean);
    } else {
      const data = safeReadJson(commandsRegistryPath, { commands: [] });
      commands = ensureArray(data.commands);
    }
  } catch {
    commands = [];
  }
  commands.forEach((cmd) => {
    if (!cmd || typeof cmd.name !== 'string') return;
    map.set(cmd.name, cmd.label || cmd.name);
  });
  return map;
}

function resolveNextValidCommands({ currentPhase, lastCommand, orchestratorPath, commandsRegistryPath, max = 3 }) {
  const orchestrator = safeReadJson(orchestratorPath, { phase_rules: {} });
  const phaseRules = orchestrator.phase_rules || {};
  const phaseNames = Object.keys(phaseRules);
  if (phaseNames.length === 0) return [];

  const labels = buildCommandLabelMap(commandsRegistryPath);
  const phase = normalizePhase(currentPhase);
  const currentIdx = Math.max(0, phaseNames.indexOf(phase));
  const currentName = phaseNames[currentIdx];
  const currentAllowed = ensureArray((phaseRules[currentName] || {}).allowed_commands).filter((c) => c !== lastCommand);

  const next = [];
  currentAllowed.forEach((cmd) => {
    if (next.length >= max) return;
    next.push({
      command: cmd,
      label: labels.get(cmd) || cmd,
      reason: `Valid in current phase (${currentName.replace(/_/g, ' ')}).`,
    });
  });

  if (next.length < max && currentIdx + 1 < phaseNames.length) {
    const nextPhaseName = phaseNames[currentIdx + 1];
    const nextAllowed = ensureArray((phaseRules[nextPhaseName] || {}).allowed_commands);
    nextAllowed.forEach((cmd) => {
      if (next.length >= max) return;
      if (next.some((x) => x.command === cmd)) return;
      next.push({
        command: cmd,
        label: labels.get(cmd) || cmd,
        reason: `Next phase option (${nextPhaseName.replace(/_/g, ' ')}).`,
      });
    });
  }

  return next;
}

function updateProjectState(options) {
  const {
    projectRoot,
    command,
    status = 'success',
    currentPhase,
    artifactUpdates = {},
    orchestratorPath = path.join(projectRoot, 'mde', 'ai-instructions', 'orchestrator.json'),
    commandsRegistryPath = path.join(projectRoot, 'mde', 'ai-instructions', 'commands'),
  } = options || {};

  if (!projectRoot || !command) return null;
  const statePath = path.join(projectRoot, 'project', 'project-state.json');
  const state = safeReadJson(statePath, {});

  const resolvedPhase = normalizePhase(currentPhase || state.current_phase || state.currentPhase || 'business_analysis');
  state.current_phase = resolvedPhase;
  state.currentPhase = resolvedPhase;
  state.status = status === 'failed' ? 'warning' : 'active';
  state.last_command = command;
  state.last_run_at = new Date().toISOString();
  state.completed_commands = ensureArray(state.completed_commands);
  state.failed_commands = ensureArray(state.failed_commands);
  state.artifacts = state.artifacts && typeof state.artifacts === 'object' ? state.artifacts : {};

  if (status === 'failed') {
    addUnique(state.failed_commands, command);
  } else {
    addUnique(state.completed_commands, command);
  }

  Object.entries(artifactUpdates).forEach(([k, v]) => {
    state.artifacts[k] = v;
  });

  const nextValid = resolveNextValidCommands({
    currentPhase: resolvedPhase,
    lastCommand: command,
    orchestratorPath,
    commandsRegistryPath,
  });
  state.next_valid_commands = nextValid.map((x) => ({ command: x.command, reason: x.reason }));
  state.recommended_next_command = nextValid[0] ? nextValid[0].command : null;

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
  return { statePath, state };
}

module.exports = {
  updateProjectState,
  resolveNextValidCommands,
};

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');
const { updateProjectState } = require('./lib/project-state');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

const root = process.cwd();
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

const findMethodologyFromCatalog = (cfg) => {
  const catalog = Array.isArray(cfg.catalog) ? cfg.catalog : [];
  for (const phase of catalog) {
    const docs = Array.isArray(phase.docs) ? phase.docs : [];
    for (const doc of docs) {
      if (doc && doc.id === 'methodology' && typeof doc.file === 'string' && doc.file.trim()) {
        return doc.file.trim();
      }
    }
  }
  return undefined;
};

const methodologyPath = resolveProject(
  configPaths.methodology
  || findMethodologyFromCatalog(configuration)
  || 'methodology.json'
);
if (!fs.existsSync(methodologyPath)) {
  console.error(`[ERROR] methodology.json missing at ${methodologyPath}`);
  process.exit(1);
}

let methodology;
try {
  methodology = JSON.parse(fs.readFileSync(methodologyPath, 'utf8'));
} catch (err) {
  console.error(`[ERROR] Failed to parse methodology.json: ${err.message}`);
  process.exit(1);
}

const phases = Array.isArray(methodology.phases) ? methodology.phases : [];

const hasTemplateToken = (value) => /<[^>]+>/.test(value);

const patternToRegex = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexSource = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexSource, 'i');
};

const existsPattern = (relPattern) => {
  const rel = relPattern.replace(/\\/g, '/');
  if (!rel.includes('*')) {
    return fs.existsSync(resolveProject(rel));
  }
  const dir = path.dirname(rel);
  const basePattern = path.basename(rel);
  const absDir = resolveProject(dir);
  if (!fs.existsSync(absDir)) return false;
  const regex = patternToRegex(basePattern);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  return entries.some((entry) => entry.isFile() && regex.test(entry.name));
};

const reportPhases = phases.map((phase) => {
  const required = Array.isArray(phase.required_artifacts) ? phase.required_artifacts : [];
  const missing = [];
  const present = [];
  const skipped = [];

  required.forEach((item) => {
    if (hasTemplateToken(item)) {
      skipped.push(item);
      return;
    }
    if (existsPattern(item)) {
      present.push(item);
    } else {
      missing.push(item);
    }
  });

  const status = missing.length === 0 ? 'complete' : 'blocked';
  return {
    name: phase.name || 'unknown',
    status,
    required,
    present,
    missing,
    skipped,
  };
});

const summary = {
  totalPhases: reportPhases.length,
  complete: reportPhases.filter((p) => p.status === 'complete').length,
  blocked: reportPhases.filter((p) => p.status === 'blocked').length,
};

const report = {
  command: 'show_phase_status',
  checkedAt: new Date().toISOString(),
  methodology: path.relative(root, methodologyPath),
  configuration: path.relative(root, manager.getConfigPath()),
  summary,
  phases: reportPhases,
};

const reportRel = configPaths['phase-status-report'] || 'work/phase-status-report.json';
const reportPath = resolveProject(reportRel);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const blockedCount = summary.blocked;
updateProjectState({
  projectRoot: projectBase,
  command: 'show_phase_status',
  status: blockedCount > 0 ? 'warning' : 'success',
  currentPhase: configuration.current_phase || configuration.currentPhase || 'governance',
  artifactUpdates: {
    [reportRel.replace(/\\/g, '/')]: 'complete',
  },
});

console.log(`Wrote ${path.relative(root, reportPath)}`);
process.exit(0);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

const root = process.cwd();
const resolveRoot = (value) => (path.isAbsolute(value) ? value : path.resolve(root, value));

const issues = [];
const addIssue = (level, message, location) => {
  issues.push({ level, message, location });
  const label = level === 'error' ? 'ERROR' : 'WARN';
  const logger = level === 'error' ? console.error : console.warn;
  const prefix = location ? `${location}: ` : '';
  logger(`[${label}] ${prefix}${message}`);
};

const loadJson = (label, filePath) => {
  if (!fs.existsSync(filePath)) {
    addIssue('error', `${label} file missing at ${path.relative(root, filePath)}`, label);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    addIssue('error', `Failed to parse ${label} file: ${err.message}`, label);
    return null;
  }
};

const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'sample/configuration.json' });
let configuration;
try {
  configuration = manager.load();
} catch (err) {
  addIssue('error', err.message || String(err), 'configuration');
  process.exit(1);
}

if (!configuration) {
  process.exit(1);
}

const configPaths = manager.getPaths();
const configPath = manager.getConfigPath();
const projectBase = manager.getProjectRoot();
const resolveProject = (value) => (path.isAbsolute(value) ? value : path.resolve(projectBase, value));
const requirementsRelative = configPaths.requirements || '1-BA/requirements.json';
const cliRequirements = getArgValue('--requirements');
const requirementsPath = cliRequirements ? resolveRoot(cliRequirements) : resolveProject(requirementsRelative);
const requirementsMdRelative = configPaths['requirements-md'];
const cliRequirementsMd = getArgValue('--requirements-md');
const requirementsMdPath = (cliRequirementsMd || requirementsMdRelative)
  ? (cliRequirementsMd ? resolveRoot(cliRequirementsMd) : resolveProject(requirementsMdRelative))
  : null;
const reportRelative = path.join(path.dirname(requirementsRelative), 'requirements-validation-report.json');
const cliReport = getArgValue('--report');
const reportPath = cliReport ? resolveRoot(cliReport) : resolveProject(reportRelative);

const requirements = loadJson('requirements', requirementsPath);
if (!requirements) {
  process.exit(1);
}

if (requirementsMdPath && !fs.existsSync(requirementsMdPath)) {
  addIssue('warning', `requirements markdown missing at ${path.relative(root, requirementsMdPath)}`, 'requirements-md');
}

const ensureStringField = (value, label, location) => {
  if (typeof value !== 'string' || !value.trim()) {
    addIssue('error', `${label} must be a non-empty string`, location);
    return false;
  }
  return true;
};

const summary = {
  goalCount: 0,
  stakeholderCount: 0,
  constraintCount: 0,
  requirementCount: 0,
  riskCount: 0,
  dependencyCount: 0,
};

const allowedStatus = new Set(['draft', 'review', 'approved', 'final']);
const allowedPriorities = new Set(['must', 'should', 'could']);
const riskLevels = new Set(['low', 'medium', 'high']);

const metadataFields = [
  { key: 'project', label: 'Project' },
  { key: 'version', label: 'Version' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
];
metadataFields.forEach(({ key, label }) => {
  ensureStringField(requirements[key], label, key);
});
if (typeof requirements.status === 'string' && !allowedStatus.has(requirements.status.toLowerCase())) {
  addIssue('warning', `Status value ${requirements.status} is outside ${Array.from(allowedStatus).join(', ')}`, 'status');
}

const goals = requirements.goals;
if (!Array.isArray(goals) || goals.length === 0) {
  addIssue('error', 'goals must be a non-empty array of statements', 'goals');
} else {
  summary.goalCount = goals.length;
  goals.forEach((goal, idx) => {
    if (typeof goal !== 'string' || !goal.trim()) {
      addIssue('warning', 'Each goal should be a non-empty string', `goals[${idx}]`);
    }
  });
}

const scope = requirements.scope;
if (!scope || typeof scope !== 'object') {
  addIssue('error', 'scope must be an object with included/excluded arrays', 'scope');
} else {
  ['included', 'excluded'].forEach((section) => {
    const values = scope[section];
    if (!Array.isArray(values) || values.length === 0) {
      addIssue('warning', `scope.${section} should be a non-empty array`, `scope.${section}`);
    } else {
      values.forEach((value, idx) => {
        if (typeof value !== 'string' || !value.trim()) {
          addIssue('warning', `scope.${section}[${idx}] must be a non-empty string`, `scope.${section}[${idx}]`);
        }
      });
    }
  });
}

const stakeholders = requirements.stakeholders;
const stakeholderRoles = new Set();
if (!Array.isArray(stakeholders) || stakeholders.length === 0) {
  addIssue('error', 'stakeholders must be an array of role/group/interest objects', 'stakeholders');
} else {
  summary.stakeholderCount = stakeholders.length;
  stakeholders.forEach((entry, idx) => {
    const baseLocation = `stakeholders[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      addIssue('error', 'stakeholder entry must be an object', baseLocation);
      return;
    }
    if (ensureStringField(entry.role, 'role', `${baseLocation}.role`)) {
      const role = entry.role.trim();
      if (stakeholderRoles.has(role)) {
        addIssue('warning', `Duplicate stakeholder role ${role}`, `${baseLocation}.role`);
      } else {
        stakeholderRoles.add(role);
      }
    }
    ensureStringField(entry.group, 'group', `${baseLocation}.group`);
    ensureStringField(entry.interest, 'interest', `${baseLocation}.interest`);
  });
}

const constraints = requirements.constraints;
const constraintIds = new Set();
if (!Array.isArray(constraints) || constraints.length === 0) {
  addIssue('error', 'constraints array is required', 'constraints');
} else {
  summary.constraintCount = constraints.length;
  constraints.forEach((entry, idx) => {
    const baseLocation = `constraints[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      addIssue('error', 'constraint entry must be an object', baseLocation);
      return;
    }
    if (ensureStringField(entry.id, 'Constraint id', `${baseLocation}.id`)) {
      const id = entry.id.trim();
      if (constraintIds.has(id)) {
        addIssue('error', `Duplicate constraint id ${id}`, `${baseLocation}.id`);
      } else {
        constraintIds.add(id);
      }
    }
    ensureStringField(entry.description, 'description', `${baseLocation}.description`);
  });
}

const requirementEntries = requirements.requirements;
const requirementIds = new Set();
const pendingSources = [];
if (!Array.isArray(requirementEntries) || requirementEntries.length === 0) {
  addIssue('error', 'requirements array must list at least one requirement', 'requirements');
} else {
  summary.requirementCount = requirementEntries.length;
  requirementEntries.forEach((entry, idx) => {
    const baseLocation = `requirements[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      addIssue('error', 'requirement must be an object', baseLocation);
      return;
    }
    if (ensureStringField(entry.id, 'Requirement id', `${baseLocation}.id`)) {
      const id = entry.id.trim();
      if (requirementIds.has(id)) {
        addIssue('error', `Duplicate requirement id ${id}`, `${baseLocation}.id`);
      } else {
        requirementIds.add(id);
      }
    }
    ensureStringField(entry.description, 'description', `${baseLocation}.description`);
    const priority = typeof entry.priority === 'string' ? entry.priority.trim().toLowerCase() : '';
    if (!allowedPriorities.has(priority)) {
      addIssue('warning', `Unknown priority ${entry.priority || 'missing'}`, `${baseLocation}.priority`);
    }
    if (!Array.isArray(entry.source) || entry.source.length === 0) {
      addIssue('warning', 'source should list at least one stakeholder, constraint, or requirement', `${baseLocation}.source`);
    } else {
      entry.source.forEach((value, idxSource) => {
        pendingSources.push({ value, location: `${baseLocation}.source[${idxSource}]` });
      });
    }
  });
}
pendingSources.forEach(({ value, location }) => {
  if (typeof value !== 'string' || !value.trim()) {
    addIssue('error', 'source entries must be non-empty strings', location);
    return;
  }
  const normalized = value.trim();
  if (normalized.startsWith('stakeholder:')) {
    const role = normalized.slice('stakeholder:'.length).trim();
    if (!stakeholderRoles.has(role)) {
      addIssue('warning', `Unknown stakeholder ${role}`, location);
    }
    return;
  }
  if (constraintIds.has(normalized) || requirementIds.has(normalized)) {
    return;
  }
  addIssue('warning', `Source reference ${normalized} not found among stakeholders, constraints, or requirements`, location);
});

const riskEntries = requirements.risks;
if (!Array.isArray(riskEntries) || riskEntries.length === 0) {
  addIssue('warning', 'risks array is missing or empty', 'risks');
} else {
  summary.riskCount = riskEntries.length;
  riskEntries.forEach((entry, idx) => {
    const baseLocation = `risks[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      addIssue('error', 'risk entry must be an object', baseLocation);
      return;
    }
    ensureStringField(entry.id, 'Risk id', `${baseLocation}.id`);
    ensureStringField(entry.description, 'description', `${baseLocation}.description`);
    const likelihood = typeof entry.likelihood === 'string' ? entry.likelihood.trim().toLowerCase() : '';
    if (!riskLevels.has(likelihood)) {
      addIssue('warning', `likelihood ${entry.likelihood || 'missing'} is unexpected`, `${baseLocation}.likelihood`);
    }
    const impact = typeof entry.impact === 'string' ? entry.impact.trim().toLowerCase() : '';
    if (!riskLevels.has(impact)) {
      addIssue('warning', `impact ${entry.impact || 'missing'} is unexpected`, `${baseLocation}.impact`);
    }
    ensureStringField(entry.mitigation, 'mitigation', `${baseLocation}.mitigation`);
  });
}

const dependencyEntries = requirements.dependencies;
if (!Array.isArray(dependencyEntries) || dependencyEntries.length === 0) {
  addIssue('warning', 'dependencies array is missing or empty', 'dependencies');
} else {
  summary.dependencyCount = dependencyEntries.length;
  dependencyEntries.forEach((entry, idx) => {
    const baseLocation = `dependencies[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      addIssue('error', 'dependency entry must be an object', baseLocation);
      return;
    }
    ensureStringField(entry.system, 'system', `${baseLocation}.system`);
    ensureStringField(entry.purpose, 'purpose', `${baseLocation}.purpose`);
  });
}

const errors = issues.filter((issue) => issue.level === 'error').length;
const warnings = issues.filter((issue) => issue.level === 'warning').length;
const finalStatus = errors > 0 ? 'failed' : warnings > 0 ? 'warning' : 'success';
const report = {
  command: 'validate_requirements',
  status: finalStatus,
  checkedAt: new Date().toISOString(),
  metadata: {
    configuration: path.relative(root, configPath),
    requirements: path.relative(root, requirementsPath),
    ...(requirementsMdPath ? { requirementsMd: path.relative(root, requirementsMdPath) } : {}),
  },
  summary,
  issues,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`Wrote ${path.relative(root, reportPath)} (${errors} errors, ${warnings} warnings)`);
process.exit(errors > 0 ? 1 : 0);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

const root = process.cwd();
const resolveRoot = (value) => (path.isAbsolute(value) ? value : path.resolve(root, value));

const cliConfigPath = getArgValue('--config');
const cliJsonPath = getArgValue('--json');
const cliReportPath = getArgValue('--report');

let config = null;
let configPath = null;
if (cliConfigPath) {
  configPath = resolveRoot(cliConfigPath);
  if (!fs.existsSync(configPath)) {
    console.error(`[ERROR] configuration.json missing at ${configPath}`);
    process.exit(1);
  }
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse configuration.json: ${err.message}`);
    process.exit(1);
  }
}

const projectBase = configPath ? path.dirname(configPath) : root;
const resolveProject = (value) => (path.isAbsolute(value) ? value : path.resolve(projectBase, value));
const configPaths = (config && config.paths) || {};

const architectureJsonPath = cliJsonPath
  ? resolveRoot(cliJsonPath)
  : (configPaths.architecture
      ? resolveProject(configPaths.architecture)
      : (configPaths['architecture-json']
          ? resolveProject(configPaths['architecture-json'])
          : resolveRoot('MDT/architecture.json')));

const reportPath = cliReportPath
  ? resolveRoot(cliReportPath)
  : path.join(projectBase, '2 Design', 'architecture-validation-report.json');

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
    addIssue('error', `${label} missing at ${path.relative(root, filePath)}`, label);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    addIssue('error', `Failed to parse ${label}: ${err.message}`, label);
    return null;
  }
};

const architecture = loadJson('architecture.json', architectureJsonPath);

const summary = {
  patternCount: 0,
  moduleCount: 0,
  dependencyRuleCount: 0,
};

if (architecture) {
  const patternList = Array.isArray(architecture.patterns)
    ? architecture.patterns
    : (Array.isArray(architecture.architectural_patterns) ? architecture.architectural_patterns : []);
  if (!Array.isArray(patternList) || patternList.length === 0) {
    addIssue('warning', 'patterns array missing or empty', 'patterns');
  } else {
    summary.patternCount = patternList.length;
    patternList.forEach((pattern, idx) => {
      if (typeof pattern !== 'string' || !pattern.trim()) {
        addIssue('warning', 'pattern entries should be non-empty strings', `patterns[${idx}]`);
      }
    });
  }

  const moduleEntries = Array.isArray(architecture.modules) ? architecture.modules : [];
  if (!Array.isArray(architecture.modules) || architecture.modules.length === 0) {
    addIssue('warning', 'modules array missing or empty', 'modules');
  } else {
    summary.moduleCount = moduleEntries.length;
  }

  const seenModuleNames = new Set();
  const requirementPattern = /^[A-Z]+-[0-9]+$/;
  moduleEntries.forEach((module, idx) => {
    const location = `modules[${idx}]`;
    if (!module || typeof module !== 'object') {
      addIssue('error', 'module entry must be an object', location);
      return;
    }

    if (!module.name || typeof module.name !== 'string' || !module.name.trim()) {
      addIssue('error', 'module name must be a non-empty string', `${location}.name`);
    } else {
      const normalizedName = module.name.trim();
      const lower = normalizedName.toLowerCase();
      if (seenModuleNames.has(lower)) {
        addIssue('error', `module name ${normalizedName} is duplicated`, `${location}.name`);
      } else {
        seenModuleNames.add(lower);
      }
    }

    if (module.responsibilities !== undefined) {
      if (!Array.isArray(module.responsibilities) || module.responsibilities.length === 0) {
        addIssue('warning', 'responsibilities should be a non-empty array', `${location}.responsibilities`);
      } else {
        module.responsibilities.forEach((resp, respIdx) => {
          if (typeof resp !== 'string' || !resp.trim()) {
            addIssue('warning', 'responsibility entries should be non-empty strings', `${location}.responsibilities[${respIdx}]`);
          }
        });
      }
    }

    if (module.requirements !== undefined) {
      if (!Array.isArray(module.requirements) || module.requirements.length === 0) {
        addIssue('warning', 'requirements should list at least one canonical reference', `${location}.requirements`);
      } else {
        module.requirements.forEach((req, reqIdx) => {
          if (typeof req !== 'string' || !req.trim()) {
            addIssue('warning', 'requirement entries should be non-empty strings', `${location}.requirements[${reqIdx}]`);
          } else if (!requirementPattern.test(req.trim())) {
            addIssue('warning', `${req} does not follow the <ENTITY>-<NUMBER> pattern`, `${location}.requirements[${reqIdx}]`);
          }
        });
      }
    }
  });

  if (Array.isArray(architecture.dependency_rules)) {
    summary.dependencyRuleCount = architecture.dependency_rules.length;
    architecture.dependency_rules.forEach((rule, idx) => {
      if (typeof rule !== 'string' || !rule.trim()) {
        addIssue('warning', 'dependency rules should be non-empty strings', `dependency_rules[${idx}]`);
      }
    });
  } else if (typeof architecture.dependency_model === 'string' && architecture.dependency_model.trim()) {
    summary.dependencyRuleCount = 1;
  } else if (architecture.dependency_rules !== undefined) {
    addIssue('warning', 'dependency_rules should be an array of strings', 'dependency_rules');
  } else {
    addIssue('warning', 'dependency_rules missing', 'dependency_rules');
  }
} else {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        command: 'validate_architecture',
        status: 'failed',
        checkedAt: new Date().toISOString(),
        metadata: {
          architectureJson: path.relative(root, architectureJsonPath),
        },
        summary,
        issues,
      },
      null,
      2
    )
  );
  process.exit(1);
}

const errors = issues.filter((issue) => issue.level === 'error').length;
const warnings = issues.filter((issue) => issue.level === 'warning').length;
const status = errors > 0 ? 'failed' : warnings > 0 ? 'warning' : 'success';

const report = {
  command: 'validate_architecture',
  status,
  checkedAt: new Date().toISOString(),
  metadata: {
    architectureJson: path.relative(root, architectureJsonPath),
  },
  summary,
  issues,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('');
console.log(`Validated ${path.relative(root, architectureJsonPath)}`);
console.log(`  Errors  : ${errors}`);
console.log(`  Warnings: ${warnings}`);
console.log(`Report   : ${path.relative(root, reportPath)}`);

process.exit(errors > 0 ? 1 : 0);

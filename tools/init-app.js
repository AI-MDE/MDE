#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');
const { updateProjectState } = require('./lib/project-state');

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function normalizeRel(relPath) {
  return String(relPath || '').replace(/\\/g, '/').trim();
}

function renderTemplate(templateContent, values) {
  let output = String(templateContent || '');
  Object.entries(values || {}).forEach(([key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(pattern, String(value ?? ''));
  });
  return output;
}

function readTemplateIfExists(projectRoot, templateRelPath) {
  if (!templateRelPath) return null;
  const abs = path.resolve(projectRoot, normalizeRel(templateRelPath));
  if (!fs.existsSync(abs)) return null;
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function isInside(baseDir, targetPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  return target === base || target.startsWith(base + path.sep);
}

function ensureDir(absPath, options, summary) {
  if (fs.existsSync(absPath)) return;
  if (options.dryRun) {
    summary.createdDirs.push(absPath + ' (dry-run)');
    return;
  }
  fs.mkdirSync(absPath, { recursive: true });
  summary.createdDirs.push(absPath);
}

function ensureFile(absPath, content, options, summary) {
  if (fs.existsSync(absPath)) {
    summary.skippedFiles.push(absPath);
    return;
  }
  if (options.dryRun) {
    summary.createdFiles.push(absPath + ' (dry-run)');
    return;
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
  summary.createdFiles.push(absPath);
}

function getCatalogEntries(config) {
  const catalog = Array.isArray(config.catalog) ? config.catalog : [];
  const entries = [];
  catalog.forEach((phase) => {
    (phase.docs || []).forEach((doc) => entries.push(doc));
    (phase.groups || []).forEach((group) => {
      if (group.scan && typeof group.scan.dir === 'string') {
        entries.push({ _scanDir: group.scan.dir });
      }
      (group.docs || []).forEach((doc) => entries.push(doc));
    });
  });
  return entries;
}

function findCatalogFile(config, docId, fallback) {
  const doc = getCatalogEntries(config).find((entry) => entry && entry.id === docId && typeof entry.file === 'string');
  return doc ? normalizeRel(doc.file) : fallback;
}

function collectDirs(config, manager) {
  const dirs = new Set();
  const addDir = (value) => {
    if (!value || typeof value !== 'string') return;
    const rel = normalizeRel(value);
    if (!rel || rel === '.') return;
    dirs.add(rel);
  };

  [
    'application',
    'ba',
    'ba/discovery',
    'ba/analyzed',
    'design',
    'output',
    'project',
    'tests',
  ].forEach(addDir);

  const mdtPath = normalizeRel(config['MDT-path'] || 'mde');
  addDir(mdtPath);
  [
    'ai-instructions',
    'architecture',
    'docs',
    'methodology',
    'schemas',
    'scripts',
    'templates',
    'tools',
    'web',
  ].forEach((part) => addDir(path.posix.join(mdtPath, part)));

  const data = manager.getConfig();
  const details = data.details && typeof data.details === 'object' ? data.details : null;
  const folders = (details && (details.folders || details['project-folders'])) || data['project-folders'] || {};
  Object.values(folders).forEach(addDir);

  const configPaths = manager.getPaths();
  Object.entries(configPaths).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    const rel = normalizeRel(value);
    if (!rel) return;
    if (key.endsWith('-dir')) {
      addDir(rel);
    } else {
      addDir(path.posix.dirname(rel));
    }
  });

  getCatalogEntries(config).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry._scanDir === 'string') addDir(entry._scanDir);
    if (typeof entry.file === 'string') addDir(path.posix.dirname(normalizeRel(entry.file)));
  });

  return Array.from(dirs);
}

function buildFiles(config) {
  const projectName = String(config['Project-Name'] || 'Application');
  const projectType = String(config['Project-Type'] || 'application');
  const mdtPath = normalizeRel(config['MDT-path'] || config['mde-path'] || 'mde');
  const metaModel = (config.metaModel && typeof config.metaModel === 'object') ? config.metaModel : {};
  const doctypesPath = normalizeRel(metaModel.doctypes || 'metaModel/doctypes.json');

  const requirementsPath = findCatalogFile(config, 'requirements-json', 'ba/requirements.md');
  const architecturePath = findCatalogFile(config, 'architecture', 'design/application_architecture.json');
  const questionsPath = 'project/questions.json';
  const openQueuePath = 'project/open-queue.json';
  const completedQuestionsPath = 'project/completed-Questions.json';
  const projectStatePath = 'project/project-state.json';

  return [
    {
      path: 'application/application.json',
      content: JSON.stringify(
        {
          name: projectName,
          type: projectType,
          description: String(config.Description || ''),
        },
        null,
        2
      ) + '\n',
    },
    {
      path: doctypesPath,
      templatePath: `${mdtPath}/templates/seeds/doctypes.json.tpl`,
      fallbackContent: JSON.stringify({}, null, 2) + '\n',
    },
    {
      path: `${mdtPath}/ai-instructions/orchestrator.json`,
      templatePath: `${mdtPath}/templates/seeds/orchestrator.json.tpl`,
      fallbackContent: JSON.stringify(
        {
          name: 'mdt_orchestrator',
          version: '1.1',
          description: `Command-driven orchestrator for ${projectName}.`,
          inputs: {
            command_registry: `${mdtPath}/ai-instructions/commands`,
            skills_registry: `${mdtPath}/ai-instructions/skills`,
          },
          execution_pipeline: [],
          phase_rules: {},
        },
        null,
        2
      ) + '\n',
    },
    {
      path: requirementsPath,
      content: `# Requirements\n\nProject: ${projectName}\n\n## Functional Requirements\n\n- \n\n## Non-Functional Requirements\n\n- \n`,
    },
    {
      path: 'ba/analysis-status.md',
      content: '# Analysis Status\n\n- status: not-started\n- lastUpdated: \n- notes: \n',
    },
    {
      path: architecturePath,
      content: JSON.stringify(
        {
          project: projectName,
          version: '0.1.0',
          architectureStyle: '',
          layers: [],
          modules: [],
          integrationPoints: [],
        },
        null,
        2
      ) + '\n',
    },
    {
      path: questionsPath,
      content: JSON.stringify({ questions: [] }, null, 2) + '\n',
    },
    {
      path: openQueuePath,
      content: JSON.stringify({ items: [] }, null, 2) + '\n',
    },
    {
      path: completedQuestionsPath,
      content: JSON.stringify({ questions: [] }, null, 2) + '\n',
    },
    {
      path: projectStatePath,
      content: JSON.stringify(
        {
          project: projectName,
          currentPhase: 'business_analysis',
          initializedAt: new Date().toISOString(),
          status: 'active',
        },
        null,
        2
      ) + '\n',
    },
    {
      path: '.env',
      content: [
        'DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres',
        'DB_SCHEMA=public',
        '',
      ].join('\n'),
    },
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mde-app',
          version: '0.1.0',
          private: true,
          scripts: {
            validate: 'node mde/tools/validate-config.js configuration.json',
            viewer: 'node mde/web/viewer.js',
          },
        },
        null,
        2
      ) + '\n',
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
          },
          include: ['src/**/*.ts', 'mde/**/*.ts'],
        },
        null,
        2
      ) + '\n',
    },
  ];
}

function run() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);
  const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'configuration.json' });

  let config;
  try {
    config = manager.load();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }

  const projectRoot = manager.getProjectRoot();
  const summary = { createdDirs: [], createdFiles: [], skippedFiles: [], skippedUnsafePaths: [] };

  collectDirs(config, manager).forEach((relDir) => {
    const absDir = path.resolve(projectRoot, relDir);
    if (!isInside(projectRoot, absDir)) {
      summary.skippedUnsafePaths.push(absDir);
      return;
    }
    ensureDir(absDir, options, summary);
  });

  const templateValues = {
    PROJECT_NAME: String(config['Project-Name'] || 'Application'),
    PROJECT_TYPE: String(config['Project-Type'] || 'application'),
    DESCRIPTION: String(config.Description || ''),
    MDE_PATH: normalizeRel(config['MDT-path'] || config['mde-path'] || 'mde'),
  };

  buildFiles(config).forEach((entry) => {
    const relFile = normalizeRel(entry.path);
    if (!relFile) return;
    const absFile = path.resolve(projectRoot, relFile);
    if (!isInside(projectRoot, absFile)) {
      summary.skippedUnsafePaths.push(absFile);
      return;
    }
    const templateRaw = readTemplateIfExists(projectRoot, entry.templatePath);
    const content = templateRaw
      ? renderTemplate(templateRaw, templateValues)
      : (entry.content || entry.fallbackContent || '');
    ensureFile(absFile, content, options, summary);
  });

  console.log(`[OK] Init app complete${options.dryRun ? ' (dry-run)' : ''}.`);
  console.log(`[OK] Project root: ${projectRoot}`);
  console.log(`[OK] Directories created: ${summary.createdDirs.length}`);
  console.log(`[OK] Files created: ${summary.createdFiles.length}`);
  console.log(`[OK] Files skipped (already existed): ${summary.skippedFiles.length}`);
  if (summary.skippedUnsafePaths.length > 0) {
    console.warn(`[WARN] Skipped unsafe paths outside project root: ${summary.skippedUnsafePaths.length}`);
  }

  if (!options.dryRun) {
    updateProjectState({
      projectRoot,
      command: 'initiate_project',
      status: 'success',
      currentPhase: 'business_analysis',
      artifactUpdates: {
        'project/project-state.json': 'complete',
        'application/application.json': fs.existsSync(path.join(projectRoot, 'application', 'application.json')) ? 'complete' : 'missing',
        'ba/requirements.md': fs.existsSync(path.join(projectRoot, 'ba', 'requirements.md')) ? 'complete' : 'missing',
      },
    });
    console.log('[OK] Project state updated with next_valid_commands.');
  }
}

run();

/**
 * Model-Driven Design Document Viewer
 * Run: node mde/web/viewer.js
 * Open: http://localhost:4000
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { ConfigurationManager } = require(path.join(__dirname, '..', 'tools', 'lib', 'config-manager'));

const PORT      = 4000;
const ROOT_ARG  = process.argv.find(arg => arg.startsWith('--root='));
const DOCS_ROOT = ROOT_ARG
  ? path.resolve(ROOT_ARG.slice('--root='.length))
  : path.join(__dirname, '..', '..', 'sample');

if (!fs.existsSync(DOCS_ROOT)) {
  console.error(`[viewer] DOCS_ROOT does not exist: ${DOCS_ROOT}`);
  console.error(`[viewer] Use: node mde/web/app.js  OR  node mde/web/viewer.js --root=<path>`);
  process.exit(1);
}

const HTML_FILE   = path.join(__dirname, 'viewer.html');
const STYLE_FILE  = path.join(__dirname, 'style.css');
const CLIENT_FILE = path.join(__dirname, 'viewer-client.js');
const REPO_ROOT = path.join(__dirname, '..', '..');
const VIEWER_LOG_LEVEL = (process.env.VIEWER_LOG_LEVEL || 'info').toLowerCase();

/**
 * Loads key=value pairs from a .env file into process.env.
 * Existing variables are not overwritten.
 * @param {string} filePath - Absolute path to the .env file.
 */
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadDotEnv(path.join(DOCS_ROOT, '.env'));
loadDotEnv(path.join(REPO_ROOT, '.env'));

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Load configuration ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

let cfg = { details: { paths: {} }, paths: {}, patterns: {} };
const configManager = new ConfigurationManager({
  cwd: DOCS_ROOT,
  configArg: 'configuration.json',
  defaultConfigPath: 'configuration.json',
});
try {
  cfg = configManager.load();
} catch (e) {
  console.warn('Warning: configuration.json not found, using built-in defaults.');
}

// Load appStructure.json directly — viewer-only concern, not in config-manager
try {
  const appStructurePath = path.join(DOCS_ROOT, 'metaModel', 'appStructure.json');
  const appStructure = JSON.parse(fs.readFileSync(appStructurePath, 'utf8'));
  if (appStructure && typeof appStructure === 'object') {
    if (cfg.catalog === undefined && Array.isArray(appStructure.catalog)) cfg.catalog = appStructure.catalog;
    if (!cfg.patterns || Object.keys(cfg.patterns).length === 0) cfg.patterns = appStructure.patterns || {};
  }
} catch { /* appStructure.json is optional */ }

const MDE_PATH_REL = cfg['mde-path'] || cfg['MDT-path'] || cfg['mdt-path'] || null;

/**
 * Resolves a dot-notation key path from a configuration object,
 * with fallback support for legacy path aliases.
 * @param {Object} obj - The configuration object to query.
 * @param {string} keyPath - Dot-notation key path (e.g. 'details.paths.use-cases-dir').
 * @returns {*} The resolved value, or undefined if not found.
 */
function resolveConfigValue(obj, keyPath) {
  if (!keyPath) return undefined;
  const direct = keyPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  if (direct !== undefined) return direct;
  if (keyPath.startsWith('details.locations.')) {
    const pathKey = keyPath.slice('details.locations.'.length);
    return ((obj && obj.details && (obj.details.locations || obj.details.paths)) || obj.paths || {})[pathKey];
  }
  if (keyPath.startsWith('details.paths.')) {
    const pathKey = keyPath.slice('details.paths.'.length);
    return ((obj && obj.details && (obj.details.locations || obj.details.paths)) || obj.paths || {})[pathKey];
  }
  if (keyPath.startsWith('paths.')) {
    const pathKey = keyPath.slice('paths.'.length);
    return ((obj && obj.details && (obj.details.locations || obj.details.paths)) || obj.paths || {})[pathKey];
  }
  if (keyPath.startsWith('details.folders.')) {
    const folderKey = keyPath.slice('details.folders.'.length);
    return ((obj && obj.details && (obj.details.folders || obj.details['project-folders'])) || obj['project-folders'] || {})[folderKey];
  }
  if (keyPath.startsWith('details.project-folders.')) {
    const folderKey = keyPath.slice('details.project-folders.'.length);
    return ((obj && obj.details && (obj.details.folders || obj.details['project-folders'])) || obj['project-folders'] || {})[folderKey];
  }
  if (keyPath.startsWith('project-folders.')) {
    const folderKey = keyPath.slice('project-folders.'.length);
    return ((obj && obj.details && (obj.details.folders || obj.details['project-folders'])) || obj['project-folders'] || {})[folderKey];
  }
  return undefined;
}

/**
 * Normalises a file path to use forward slashes.
 * @param {string} p - The path to normalise.
 * @returns {string}
 */
function normalizeRel(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Converts a string to a URL-safe kebab-case slug.
 * @param {string} value - The string to slugify.
 * @returns {string}
 */
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';
}

/**
 * Derives a stable document ID from a relative file path.
 * @param {string} relPath - Relative path to the document file.
 * @param {string} [fallback='doc'] - Value to return if the slug is empty.
 * @returns {string}
 */
function makeDocId(relPath, fallback = 'doc') {
  const rel = normalizeRel(relPath || '');
  const noExt = rel.replace(/\.[^.]+$/, '');
  const slug = slugify(noExt.replace(/[\/\\]/g, '-'));
  return slug || fallback;
}

/**
 * Strips a UTF-8 BOM character from the start of a string.
 * @param {string} value - The string to strip.
 * @returns {string}
 */
function stripBom(value) {
  return typeof value === 'string' ? value.replace(/^\uFEFF/, '') : value;
}

/**
 * Resolves a path relative to DOCS_ROOT to an absolute path.
 * @param {string} relPath - Relative path string.
 * @returns {string|undefined} Absolute path, or undefined if input is invalid.
 */
function resolveProjectPath(relPath) {
  if (!relPath || typeof relPath !== 'string') return undefined;
  return path.resolve(DOCS_ROOT, relPath);
}

/**
 * Returns true if a path relative to DOCS_ROOT exists on disk.
 * @param {string} relPath - Relative path string.
 * @returns {boolean}
 */
function projectPathExists(relPath) {
  const abs = resolveProjectPath(relPath);
  return Boolean(abs) && fs.existsSync(abs);
}

let doctypeTemplates = {};

/**
 * Reads all valid command JSON files from a folder and returns them sorted by name.
 * @param {string} folderPath - Absolute path to the commands folder.
 * @returns {Array<Object>} Array of parsed command objects.
 */
function loadCommandsFromFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
    .map((entry) => {
      const filePath = path.join(folderPath, entry.name);
      try {
        const parsed = JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')));
        if (parsed && typeof parsed === 'object' && parsed.name) return parsed;
      } catch {
        // Ignore invalid command json and continue.
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/**
 * Resolves the commands directory from configuration and loads all command definitions.
 * @returns {Array<Object>} Array of parsed command objects, or empty array if not configured.
 */
function loadCommandRegistry() {
  const folderRel = resolveConfigValue(cfg, 'details.paths.commands-dir')
    || resolveConfigValue(cfg, 'paths.commands-dir')
    || (MDE_PATH_REL && `${MDE_PATH_REL}/ai-instructions/commands`);
  if (!folderRel) {
    console.warn('[viewer] commands-dir not configured; command registry will be empty.');
    return [];
  }
  const folderAbs = resolveProjectPath(folderRel);
  return loadCommandsFromFolder(folderAbs);
}

const commandRegistry = loadCommandRegistry();

const TOOLS_ROOT = resolveProjectPath(
  resolveConfigValue(cfg, 'details.paths.tools-dir')
  || resolveConfigValue(cfg, 'paths.tools-dir')
  || (MDE_PATH_REL && `${MDE_PATH_REL}/tools`)
);

const AI_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Returns an ISO timestamp string for the current moment.
 * @returns {string}
 */
function ts() {
  return new Date().toISOString();
}

/**
 * Determines whether a log message at the given level should be emitted,
 * based on the VIEWER_LOG_LEVEL environment variable.
 * @param {'silent'|'error'|'warn'|'info'|'debug'} level
 * @returns {boolean}
 */
function shouldLog(level) {
  const rank = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
  const current = rank[VIEWER_LOG_LEVEL] ?? rank.warn;
  const requested = rank[level] ?? rank.info;
  return current >= requested;
}

/**
 * Emits an info-level log message when the log level permits.
 * @param {string} message
 */
function logInfo(message) {
  if (!shouldLog('info')) return;
  console.log(`[viewer ${ts()}] ${message}`);
}

/**
 * Emits a warn-level log message when the log level permits.
 * @param {string} message
 */
function logWarn(message) {
  if (!shouldLog('warn')) return;
  console.warn(`[viewer ${ts()}] ${message}`);
}

/**
 * Emits an error-level log message when the log level permits.
 * Includes the error stack trace when available.
 * @param {string} message
 * @param {Error} [err] - Optional error object to include.
 */
function logError(message, err) {
  if (!shouldLog('error')) return;
  if (err) {
    console.error(`[viewer ${ts()}] ${message}`, err && err.stack ? err.stack : err);
    return;
  }
  console.error(`[viewer ${ts()}] ${message}`);
}

process.on('uncaughtException', (err) => {
  logError('Uncaught exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection', reason);
  process.exit(1);
});

// Resolved paths (relative to DOCS_ROOT)
const P = (cfg.details && (cfg.details.locations || cfg.details.paths)) || cfg.paths || {};
const MDT_PATH = cfg['MDT-path'] || cfg['mdt-path'];
const ALLOWED_ROOTS = [
  DOCS_ROOT,
  MDT_PATH ? path.resolve(DOCS_ROOT, MDT_PATH) : null,
].filter(Boolean);

// Compiled patterns — sourced from metaModel/appStructure.json
const _patterns = cfg.patterns || {};
/**
 * Compiles a named regex pattern from the loaded configuration.
 * @param {string} key - The pattern name (e.g. 'entity', 'use-case').
 * @returns {RegExp|null} The compiled regex, or null if the key is missing or invalid.
 */
function compilePattern(key) {
  const src = _patterns[key];
  if (!src) return null;
  try { return new RegExp(src); } catch { return null; }
}

// Editable path prefixes (files the PUT endpoint may overwrite)
const EDITABLE_DIRS = [
  P['use-cases-dir'],
  P['entities-dir'],
  P['modules-dir'],
  P['requirements'] && path.dirname(P['requirements']),
].filter(Boolean);

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Document tree ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬


/**
 * Resolves the relative file path for a catalog entry.
 * Returns null for virtual entries (no file), or undefined if no path can be resolved.
 * @param {Object} entry - A catalog doc entry.
 * @returns {string|null|undefined}
 */
function resolveCatalogRel(entry) {
  if (entry.virtual || entry.file === null || entry.path === null || entry.pathRef === null) {
    return null;
  }
  if (typeof entry.file === 'string' && entry.file.trim()) return normalizeRel(entry.file);
  if (typeof entry.path === 'string' && entry.path.trim()) return normalizeRel(entry.path);
  if (typeof entry.pathRef === 'string' && entry.pathRef.trim()) {
    const resolved = resolveConfigValue(cfg, entry.pathRef);
    return (typeof resolved === 'string' && resolved.trim()) ? normalizeRel(resolved) : undefined;
  }
  return undefined;
}

/**
 * Compiles a catalog doc entry into a normalised doc descriptor object.
 * @param {Object} entry - A raw catalog doc entry.
 * @returns {{id:string, label:string, file:string|null, docType:string|null}|null}
 */
function compileDoc(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const file = resolveCatalogRel(entry);
  if (file === null) {
    return {
      id: entry.id || slugify(entry.label || entry.title || 'virtual-doc'),
      label: entry.label || entry.title || entry.id || 'Virtual Document',
      file: null,
      docType: entry.docType || null,
    };
  }
  if (!file) return null;
  if (entry.includeIfExists && !projectPathExists(file)) return null;
  const fallbackLabel = path.basename(file).replace(/\.[^.]+$/, '');
  return {
    id: entry.id || makeDocId(file),
    label: entry.label || entry.title || fallbackLabel,
    file,
    docType: entry.docType || null,
  };
}

/**
 * Derives a doc descriptor for a file found by directory scanning.
 * @param {string} filename - The bare filename (e.g. 'uc-01-onboard.md').
 * @param {string} relFile - The relative file path from DOCS_ROOT.
 * @param {string} kind - The scan kind ('use-case', 'entity', 'module', or other).
 * @returns {{id:string, label:string, file:string, docType:string}}
 */
function deriveScannedDoc(filename, relFile, kind) {
  const rel = normalizeRel(relFile);
  const relNoDot = rel.startsWith('./') ? rel.slice(2) : rel;
  const inferFileDocType = (value) => {
    const key = normalizeRel(value).replace(/^\.\//, '');
    if (key === 'configuration.json') return 'root-configuration';
    if (key === 'mde/ai-instructions/orchestrator.json') return 'orchestrator';
    return null;
  };
  switch (kind) {
    case 'use-case':
      return { id: filename.replace(/\.md$/i, ''), label: ucLabel(filename), file: rel, docType: 'use-case' };
    case 'entity':
      return { id: filename.replace(/\.json$/i, ''), label: entLabel(filename), file: rel, docType: 'entity' };
    case 'module':
      return { id: rel.replace(/\.json$/i, ''), label: modLabel(filename), file: rel, docType: 'module' };
    default:
      return {
        id: makeDocId(rel),
        label: relNoDot,
        file: rel,
        docType: inferFileDocType(rel) || kind || 'file',
      };
  }
}

/**
 * Compiles a catalog group entry (which may include a directory scan) into a
 * normalised group descriptor with a docs array.
 * @param {Object} group - A raw catalog group entry.
 * @returns {{id:string, label:string, docs:Array}|null}
 */
function compileGroup(group) {
  if (!group || typeof group !== 'object') return null;
  let docs = [];
  if (group.scan) {
    const dir = group.scan.dir
      || resolveConfigValue(cfg, group.scan.dirRef);
    if (!dir) {
      logWarn(`Group "${group.id || group.label}" has a scan with no dir; skipping.`);
      return null;
    }
    const patternSource = group.scan.pattern
      || resolveConfigValue(cfg, group.scan.patternRef)
      || '.*';
    let pattern;
    try {
      pattern = new RegExp(patternSource);
    } catch {
      pattern = /.*/;
    }
    const files = group.scan.recursive ? scanDirRecursive(dir, pattern) : scanDir(dir, pattern);
    docs = files.map(file => {
      const relFile = group.scan.recursive ? normalizeRel(file) : `${normalizeRel(dir)}/${file}`;
      return deriveScannedDoc(path.basename(file), relFile, group.scan.kind);
    });
  } else {
    docs = (group.docs || []).map(compileDoc).filter(Boolean);
  }
  if (docs.length === 0 && !group.includeIfEmpty) return null;
  const fallbackId = group.id || slugify(group.label || group.title || 'group');
  const fallbackLabel = group.label || group.title || group.id || 'Group';
  return { id: fallbackId, label: fallbackLabel, docs };
}

/**
 * Builds the full document tree (phases with groups and docs) from the
 * loaded configuration catalog. Filters out the 'meta' phase.
 * @returns {Array<{id:string, label:string, docs?:Array, groups?:Array}>}
 */
function buildPhases() {
  const appStructure = cfg['app-structure'] || cfg.viewer || null;
  const catalog = Array.isArray(cfg.catalog)
    ? cfg.catalog
    : (appStructure && Array.isArray(appStructure.catalog))
    ? appStructure.catalog
    : null;
  if (!catalog) {
    logWarn('No catalog found in configuration. Run: node mde/scripts/generateAppStructure.js');
    return [];
  }
  return catalog
    .filter(phase => phase && phase.id !== 'meta')
    .map(phase => {
      if (!phase || typeof phase !== 'object') return null;
      const docs = (phase.docs || []).map(compileDoc).filter(Boolean);
      const groups = (phase.groups || []).map(compileGroup).filter(Boolean);
      if (docs.length === 0 && groups.length === 0 && !phase.includeIfEmpty) return null;
      const compiled = {
        id: phase.id || slugify(phase.label || phase.title || 'phase'),
        label: phase.label || phase.title || phase.id || 'Phase',
      };
      if (docs.length > 0) compiled.docs = docs;
      if (groups.length > 0) compiled.groups = groups;
      return compiled;
    })
    .filter(Boolean);
}

const PHASES = buildPhases();
const APP_STRUCTURE = cfg['app-structure'] || cfg.viewer || {};

console.log(`[viewer] Loaded configuration with ${PHASES.length} phases, ${commandRegistry.length} commands, and ${Object.keys(cfg.patterns || {}).length} patterns.`);

/**
 * Finds the first scan configuration block in the catalog for the given kind.
 * @param {'use-case'|'entity'|'module'} kind - The scan kind to search for.
 * @returns {Object|null} The scan config object, or null if not found.
 */
function findScanConfig(kind) {
  for (const phase of (cfg.catalog || [])) {
    for (const group of (phase.groups || [])) {
      if (group.scan && group.scan.kind === kind) return group.scan;
    }
  }
  return null;
}

/**
 * Converts a string to lowercase snake_case.
 * @param {string} value
 * @returns {string}
 */
function toSnake(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Normalises a command phase label to a canonical snake_case identifier.
 * @param {string} value - Raw phase label or ID.
 * @returns {string}
 */
function normalizeCommandPhase(value) {
  const x = toSnake(value);
  return x === 'project_initiation' ? 'project_initiation' : x;
}

/**
 * Maps a catalog phase object to a semantic phase identifier used for
 * command binding (e.g. 'business_analysis', 'system_design').
 * @param {{id:string, label:string}} phase
 * @returns {string}
 */
function semanticPhaseFromCatalog(phase) {
  const label = String((phase && phase.label) || '');
  const id = String((phase && phase.id) || '');
  const txt = `${id} ${label}`.toLowerCase();
  if (txt.includes('business analysis')) return 'business_analysis';
  if (txt.includes('system design')) return 'system_design';
  if (txt.includes('module definition')) return 'module_definition';
  if (txt.includes('module specification')) return 'module_specification';
  if (txt.includes('project workspace') || txt.includes('project initiation')) return 'project_initiation';
  if (txt.includes('entity')) return 'system_design';
  if (txt.includes('test') || txt.includes('traceability') || txt.includes('governance') || txt.includes('reference')) return 'governance';
  return toSnake(label || id);
}
/**
 * Returns an array of unique truthy values, preserving order.
 * @param {Array} values
 * @returns {Array}
 */
function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

/**
 * Returns the names of commands whose phase matches the given phase name.
 * @param {Array} commands - Array of command objects.
 * @param {string} phaseName - Normalized phase name to match.
 * @returns {string[]} Matching command names.
 */
function commandNamesForPhase(commands, phaseName) {
  return commands
    .filter((c) => normalizeCommandPhase(c.phase) === phaseName)
    .map((c) => c.name);
}

/**
 * Builds the command-binding map that associates phases, docTypes, and doc IDs
 * with recommended commands, merging defaults with config overrides.
 * @returns {{ default: string[], phases: Object, docTypes: Object, docIds: Object }}
 */
function loadCommandBindings() {
  const fallback = cfg.commandBindings || APP_STRUCTURE.commandBindings || {};
  const available = new Set(commandRegistry.map((c) => c.name).filter(Boolean));
  const filterAvailable = (names) => (names || []).filter((name) => available.has(name));
  const mergeLists = (left, right) => unique([...(left || []), ...(right || [])]);

  const defaultPriority = [
    'init_app',
    'initiate_project',
    'validate_project_structure',
    'show_phase_status',
    'generate_documentation',
  ];
  const defaultCommands = filterAvailable(defaultPriority);

  const phases = {};
  (PHASES || []).forEach((phase) => {
    if (!phase || !phase.id) return;
    const semantic = semanticPhaseFromCatalog(phase);
    const derived = filterAvailable(commandNamesForPhase(commandRegistry, semantic));
    phases[phase.id] = mergeLists(derived, filterAvailable(fallback.phases && fallback.phases[phase.id]));
  });

  const docTypes = {};
  const docIds = {};
  Object.entries(cfg.doctypes || {}).forEach(([docType, entry]) => {
    const exceptionOnly = Array.isArray(entry && entry.recommendedCommands)
      ? filterAvailable(entry.recommendedCommands)
      : [];

    docTypes[docType] = mergeLists(exceptionOnly, filterAvailable(fallback.docTypes && fallback.docTypes[docType]));

    const ids = Array.isArray(entry && entry.ids) ? entry.ids : [];
    ids.forEach((id) => {
      docIds[id] = mergeLists(docIds[id], docTypes[docType]);
      docIds[id] = mergeLists(docIds[id], filterAvailable(fallback.docIds && fallback.docIds[id]));
    });
  });

  return {
    default: mergeLists(defaultCommands, filterAvailable(fallback.default)),
    phases,
    docTypes,
    docIds,
  };
}

const COMMAND_BINDINGS = loadCommandBindings();
const DOCS_BY_FILE = new Map();
const DOCS_BY_ID = new Map();
/**
 * Indexes a document descriptor by its relative file path into DOCS_BY_FILE.
 * @param {{ file?: string }} doc - Document descriptor to index.
 */
function addDocFileIndex(doc) {
  if (!doc || !doc.file) return;
  const rel = normalizeRel(doc.file);
  DOCS_BY_FILE.set(rel, doc);
  if (rel.startsWith('./')) DOCS_BY_FILE.set(rel.slice(2), doc);
}

PHASES.forEach(phase => {
  (phase.docs || []).forEach(doc => {
    DOCS_BY_ID.set(doc.id, doc);
    addDocFileIndex(doc);
  });
  (phase.groups || []).forEach(group => {
    (group.docs || []).forEach(doc => {
      DOCS_BY_ID.set(doc.id, doc);
      addDocFileIndex(doc);
    });
  });
});

try {
  const docTypeEntries = cfg.doctypes || {};
  doctypeTemplates = Object.entries(docTypeEntries).reduce((acc, [docType, config]) => {
    if (!config || typeof config !== 'object') return acc;
    const template = config.template;
    if (typeof template === 'string' && template.trim()) {
      acc[docType] = template;
    }
    return acc;
  }, {});
} catch {
  doctypeTemplates = {};
}

/**
 * Lists files in a subdirectory of DOCS_ROOT that match a filename pattern.
 * @param {string} subdir - Subdirectory path relative to DOCS_ROOT.
 * @param {RegExp} pattern - Regex tested against each filename.
 * @returns {string[]} Sorted array of matching filenames.
 */
function scanDir(subdir, pattern) {
  try {
    return fs.readdirSync(path.join(DOCS_ROOT, subdir), { withFileTypes: true })
      .filter((entry) => entry.isFile() && pattern.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch { return []; }
}

/**
 * Traverses a nested object by dot-separated key path.
 * Use '.' as keyPath to return the top-level object itself.
 * @param {Object} obj - Object to traverse.
 * @param {string} keyPath - Dot-separated key path (e.g. 'a.b.c').
 * @returns {*} Value at the path, or undefined if not found.
 */
function resolvePath(obj, keyPath) {
  if (!keyPath) return undefined;
  if (keyPath === '.') {
    if (obj && Object.prototype.hasOwnProperty.call(obj, '.')) return obj['.'];
    return obj;
  }
  return keyPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * Converts a value to a human-readable string for template substitution.
 * Arrays become comma-separated strings; objects become pretty-printed JSON.
 * @param {*} value - Value to format.
 * @returns {string}
 */
function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Prepares template data from a parsed JSON document, adding derived fields
 * such as phase_rules_list and phase_cycle for methodology-style templates.
 * @param {Object|*} parsed - Parsed document object.
 * @param {string} relPath - Relative path of the source file (reserved for future use).
 * @returns {Object|*} Data object ready for template rendering.
 */
function buildTemplateData(parsed, relPath) {
  const data = (parsed && typeof parsed === 'object') ? { ...parsed } : parsed;
  if (data && data.phase_rules && typeof data.phase_rules === 'object') {
    const phaseRules = data.phase_rules && typeof data.phase_rules === 'object'
      ? data.phase_rules
      : {};

    data.phase_rules_list = Object.entries(phaseRules).map(([phase, rules], index, all) => ({
      phase,
      phase_index: index + 1,
      next_phase: all[index + 1] ? all[index + 1][0] : '',
      allowed_commands: Array.isArray(rules && rules.allowed_commands) ? rules.allowed_commands : [],
      entry_conditions: Array.isArray(rules && rules.entry_conditions) ? rules.entry_conditions : [],
      exit_conditions: Array.isArray(rules && rules.exit_conditions) ? rules.exit_conditions : [],
    }));
    data.phase_cycle = Object.keys(phaseRules).join(' -> ');
  }

  return data;
}

/**
 * Renders a Mustache-style template string against a data object.
 * Supports {{#section}}...{{/section}} blocks, {{^inverse}} blocks, and {{variable}} substitution.
 * A depth guard prevents infinite recursion.
 * @param {string} template - Template string with {{...}} placeholders.
 * @param {Object} data - Data to interpolate.
 * @param {number} [_depth=0] - Internal recursion depth counter.
 * @returns {string} Rendered string.
 */
function renderTemplate(template, data, _depth = 0) {
  if (_depth > 20) { logWarn('renderTemplate: max depth exceeded — possible infinite loop'); return ''; }
  let out = template;
  const sectionRe = /{{#([^}]+)}}([\s\S]*?){{\/\1}}/g;
  out = out.replace(sectionRe, (_, key, inner) => {
    const value = resolvePath(data, key.trim());
    if (Array.isArray(value)) {
      return value.map(item => {
        const ctx = (item && typeof item === 'object') ? item : { '.': item };
        return renderTemplate(inner, { ...data, ...ctx, '.': item }, _depth + 1);
      }).join('');
    }
    if (value && typeof value !== 'object') {
      return renderTemplate(inner, data, _depth + 1);
    }
    return '';
  });
  const varRe = /{{([^}]+)}}/g;
  out = out.replace(varRe, (_, key) => {
    const value = resolvePath(data, key.trim());
    return formatValue(value);
  });
  return out;
}

/**
 * Returns the raw template string for a given document path, or null if the
 * document should be sent as raw JSON (client-rendered docTypes, entity files,
 * or missing/unconfigured templates).
 * @param {string} relPath - Relative path of the document file.
 * @returns {string|null} Template content, or null to skip templating.
 */
function resolveTemplate(relPath) {
  let key = normalizeRel(relPath);
  if (key.startsWith('./')) key = key.slice(2);
  const denyTemplate = [
    /(^|\/)ent-.*\.json$/i,
  ];
  if (denyTemplate.some(re => re.test(key))) return null;
  const docEntry = DOCS_BY_FILE.get(key);
  const docType = docEntry && docEntry.docType ? docEntry.docType : null;
  // These docTypes have dedicated client-side renderers — must receive raw JSON
  const CLIENT_RENDERED_DOCTYPES = new Set([
    'module-catalog', 'entity-catalog', 'entity', 'traceability', 'project-state',
  ]);
  if (CLIENT_RENDERED_DOCTYPES.has(docType)) return null;
  const templatePath = docType ? doctypeTemplates[docType] : null;
  if (!templatePath) return null;
  const abs = path.resolve(REPO_ROOT, templatePath);
  if (!fs.existsSync(abs)) return null;
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Recursively lists files under a subdirectory of DOCS_ROOT whose names match
 * a filename pattern, returning paths relative to DOCS_ROOT.
 * @param {string} subdir - Subdirectory path relative to DOCS_ROOT.
 * @param {RegExp} pattern - Regex tested against each filename.
 * @returns {string[]} Sorted array of matching relative file paths.
 */
function scanDirRecursive(subdir, pattern) {
  const results = [];
  const rootDir = path.join(DOCS_ROOT, subdir);
  try {
    const stack = [rootDir];
    while (stack.length) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const abs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
        } else if (pattern.test(entry.name)) {
          const rel = path.relative(DOCS_ROOT, abs).replace(/\\/g, '/');
          results.push(rel);
        }
      }
    }
  } catch {
    return [];
  }
  return results.sort();
}

/**
 * Derives a human-readable label from a use-case filename (e.g. "uc-01-approve-check.md").
 * @param {string} filename - Bare filename (no directory prefix).
 * @returns {string} Label like "UC-01: Approve Check", or the original filename on no match.
 */
function ucLabel(filename) {
  const m = filename.match(/^(uc-\d+)[-_](.+)\.md$/i);
  if (!m) return filename;
  return `${m[1].toUpperCase()}: ${m[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
}


/**
 * Derives a PascalCase label from an entity filename (e.g. "ent-claim-item.json" → "ClaimItem").
 * @param {string} filename - Bare filename.
 * @returns {string} PascalCase label, or the original filename on no match.
 */
function entLabel(filename) {
  const m = filename.match(/^ent-(.+)\.json$/i);
  if (!m) return filename;
  return m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())
             .replace(/^[a-z]/, c => c.toUpperCase());
}

/**
 * Derives a human-readable label from a module filename (e.g. "srv-01-auth.json" → "SRV-01: Auth").
 * @param {string} filename - Bare filename.
 * @returns {string} Label like "SRV-01: Auth", or the original filename on no match.
 */
function modLabel(filename) {
  const m = filename.match(/^((?:srv|dal)-\d+)[-_](.+)\.json$/i);
  if (!m) return filename;
  return `${m[1].toUpperCase()}: ${m[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
}



logInfo(`Editable directories: ${JSON.stringify(EDITABLE_DIRS)}`);


// ── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (shouldLog('debug')) logInfo(`HTTP ${req.method} ${req.url}`);
  res.on('finish', () => {
    if (shouldLog('debug')) logInfo(`HTTP ${req.method} ${req.url} -> ${res.statusCode}`);
  });

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === '/viewer.html') {
    serve(res, HTML_FILE, 'text/html');

  } else if (url.pathname === '/style.css') {
    serve(res, STYLE_FILE, 'text/css');

  } else if (url.pathname === '/viewer-client.js') {
    serve(res, CLIENT_FILE, 'text/javascript');

  } else if (url.pathname === '/api/config') {
    json(res, cfg);

  } else if (url.pathname === '/api/tree') {
    json(res, PHASES);

  } else if (url.pathname === '/api/commands') {
    const list = commandRegistry.map(c => ({
      name: c.name,
      label: c.label,
      requires: c.requires || [],
      produces: c.produces || [],
      ai: c.ai || 'none',
    }));
    json(res, {
      commands: list,
      aiAvailable: Boolean(AI_KEY),
      bindings: COMMAND_BINDINGS,
    });

  } else if (url.pathname === '/api/prompt') {
    const cmdName = url.searchParams.get('command');
    const cmd = commandRegistry.find(c => c.name === cmdName);
    if (!cmd) { res.writeHead(404); res.end('Unknown command'); return; }
    const prompt = buildPrompt(cmd);
    const cfgLocal = readConfig();
    appendTaskLog(cfgLocal, {
      timestamp: new Date().toISOString(),
      action: 'copy_prompt',
      command: cmdName,
      ai: cmd.ai || 'none',
    });
    json(res, { prompt, ai: cmd.ai || 'none', aiAvailable: Boolean(AI_KEY) });

  } else if (url.pathname === '/api/log-command') {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.command) { res.writeHead(400); res.end('Missing command'); return; }
        appendCommandLog({ ran_at: new Date().toISOString(), ...entry });
        json(res, { ok: true });
      } catch { res.writeHead(400); res.end('Bad JSON'); }
    });

  } else if (url.pathname === '/api/run') {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { command, options } = JSON.parse(body);
        if (!command) { res.writeHead(400); res.end('Missing command'); return; }
        const cmdMeta = commandRegistry.find(c => c.name === command);
        if (cmdMeta && cmdMeta.ai === 'required') {
          res.writeHead(409);
          res.end('AI required: use Copy Prompt to run this command.');
          return;
        }
        if (!TOOLS_ROOT) {
          res.writeHead(500);
          res.end('tools-dir not configured; set mde-path in configuration.json');
          return;
        }
        const cfgLocal = readConfig();
        const cfgPaths = (cfgLocal.details && (cfgLocal.details.locations || cfgLocal.details.paths)) || cfgLocal.paths || {};

        const cmdLabel = cmdMeta?.label || command;

        if (command === 'validate_requirements') {
          const tool = path.join(TOOLS_ROOT, 'validate-requirements.js');
          const args = [`--config=${path.join(DOCS_ROOT, 'configuration.json')}`];
          runTool(tool, args, (result) => json(res, result), { command, label: cmdLabel });
          return;
        }

        if (command === 'validate_architecture') {
          const tool = path.join(TOOLS_ROOT, 'validate-architecture.js');
          const args = [`--config=${path.join(DOCS_ROOT, 'configuration.json')}`];
          runTool(tool, args, (result) => json(res, result), { command, label: cmdLabel });
          return;
        }

        if (command === 'generate_dal') {
          const tool = path.join(TOOLS_ROOT, 'generate-dal.js');
          const args = [`--config=${path.join(DOCS_ROOT, 'configuration.json')}`];
          if (options && typeof options.dalTests !== 'undefined') {
            args.push(`--tests=${options.dalTests ? 'true' : 'false'}`);
          }
          if (options && typeof options.dalServices !== 'undefined') {
            args.push(`--services=${options.dalServices ? 'true' : 'false'}`);
          }
          runTool(tool, args, (result) => json(res, result), { command, label: cmdLabel });
          return;
        }

        if (command === 'show_phase_status') {
          const tool = path.join(TOOLS_ROOT, 'show-phase-status.js');
          const args = [`--config=${path.join(DOCS_ROOT, 'configuration.json')}`];
          runTool(tool, args, (result) => json(res, result), { command, label: cmdLabel });
          return;
        }

        const toolCandidates = [
          `${command}.js`,
          `${command.replace(/_/g, '-')}.js`,
        ];
        const toolPath = toolCandidates
          .map(name => path.join(TOOLS_ROOT, name))
          .find(p => fs.existsSync(p));
        if (toolPath) {
          const args = [`--config=${path.join(DOCS_ROOT, 'configuration.json')}`];
          runTool(toolPath, args, (result) => json(res, result), { command, label: cmdLabel });
          return;
        }
        res.writeHead(400);
        res.end(`Command not wired: ${command}`);
      } catch (e) {
        res.writeHead(400); res.end('Bad JSON');
      }
    });

  } else if (url.pathname === '/api/entities') {
    const entScan = findScanConfig('entity');
    if (!entScan || !entScan.dir) { json(res, []); }
    else {
      const pattern = compilePattern('entity') || /.*/;
      const files = scanDir(entScan.dir, pattern);
      const entities = files.map(f => {
        try { return JSON.parse(stripBom(fs.readFileSync(path.join(DOCS_ROOT, entScan.dir, f), 'utf8'))); }
        catch { return null; }
      }).filter(Boolean);
      json(res, entities);
    }

  } else if (url.pathname.startsWith('/api/doc/')) {
    const rel = decodeURIComponent(url.pathname.slice('/api/doc/'.length));
    const abs = path.resolve(DOCS_ROOT, rel);
    logInfo(`Document request: ${req.method} ${rel}`);
    const allowed = ALLOWED_ROOTS.some(root => {
      const base = path.resolve(root);
      return abs === base || abs.startsWith(base + path.sep);
    });
    if (!allowed) {
      logWarn(`Document request denied (outside allowed roots): ${rel}`);
      res.writeHead(403);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      // redirect bare directory paths to their index.md
      let resolvedAbs = abs;
      try {
        if (fs.statSync(abs).isDirectory()) {
          resolvedAbs = path.join(abs, 'index.md');
        }
      } catch { /* file not found — let readFile produce the error */ }

      fs.readFile(resolvedAbs, 'utf8', (err, data) => {
        if (err) {
          logWarn(`Document read failed: ${resolvedAbs} (${err.message})`);
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        try {
          const ext = path.extname(resolvedAbs).slice(1);
          if (ext === 'json') {
            const template = resolveTemplate(rel);
            const forceRaw = url.searchParams.get('raw') === '1';
            if (template && !forceRaw) {
              try {
                const parsed = JSON.parse(stripBom(data));
                const rendered = renderTemplate(template, buildTemplateData(parsed, rel));
                json(res, { content: rendered, ext: 'md', renderedFrom: rel });
                return;
              } catch (e) {
                logWarn(`Template render failed for ${rel}: ${e.message}`);
                // fall through to raw JSON
              }
            }
          }
          json(res, { content: data, ext: path.extname(resolvedAbs).slice(1) });
        } catch (e) {
          logWarn(`Document response failed for ${rel}: ${e.message}`);
          if (!res.headersSent) { res.writeHead(500); res.end('Internal error'); }
        }
      });

    } else if (req.method === 'PUT') {
      const editable = EDITABLE_DIRS.some(dir => rel.startsWith(dir));
      if (!editable) {
        logWarn(`Document edit denied (not editable path): ${rel}`);
        res.writeHead(403);
        res.end('Editing not allowed for this path');
        return;
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { content } = JSON.parse(body);
          fs.writeFile(abs, content, 'utf8', err => {
            if (err) { res.writeHead(500); res.end(String(err)); return; }
            json(res, { ok: true });
          });
        } catch (e) { res.writeHead(400); res.end('Bad JSON'); }
      });

    } else {
      logWarn(`Unsupported document method: ${req.method} for ${rel}`);
      res.writeHead(405); res.end();
    }

  } else if (url.pathname === '/api/new') {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { type, name } = JSON.parse(body);
        if (!type || !name || !/^[\w\-]+$/.test(name)) {
          res.writeHead(400); res.end('Invalid type or name'); return;
        }
        let rel, content;
        const ucScan  = findScanConfig('use-case');
        const entScan = findScanConfig('entity');
        const ucDir   = ucScan && ucScan.dir;
        const entDir  = entScan && entScan.dir;
        if (type === 'use-case') {
          if (!ucDir) { res.writeHead(404); res.end('No use-case directory configured in catalog'); return; }
          rel     = `${ucDir}/uc-${name}.md`;
          content = `# UC: ${name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n## Description\n\n_Describe the use case here._\n\n## Actors\n\n- \n\n## Preconditions\n\n- \n\n## Main Flow\n\n1. \n\n## Postconditions\n\n- \n`;
        } else if (type === 'entity') {
          if (!entDir) { res.writeHead(404); res.end('No entity directory configured in catalog'); return; }
          rel     = `${entDir}/ent-${name}.json`;
          content = JSON.stringify({
            entityId:     `ent-${name}`,
            entityName:   name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()),
            description:  '',
            category:     'supporting',
            owningModule: '',
            managedBy:    'ui',
            relationships: [],
            fields:       [{ name: 'id', type: 'uuid', required: true }],
            indexes:      [],
            rules:        [],
            stateMachine: { states: [], initial: '', transitions: [] },
            events:       { published: [] },
          }, null, 2) + '\n';
        } else {
          res.writeHead(400); res.end('Unknown type'); return;
        }
        const abs2 = path.join(DOCS_ROOT, rel);
        if (!abs2.startsWith(DOCS_ROOT)) { res.writeHead(403); res.end(); return; }
        if (fs.existsSync(abs2)) { res.writeHead(409); res.end('File already exists'); return; }
        fs.writeFile(abs2, content, 'utf8', err => {
          if (err) { res.writeHead(500); res.end(String(err)); return; }
          json(res, { ok: true, file: rel });
        });
      } catch (e) { res.writeHead(400); res.end('Bad JSON'); }
    });

    } else {
      res.writeHead(404); res.end();
    }
  } catch (err) {
    logError(`Request handling error (${req.method} ${req.url})`, err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: 'internal_server_error' }));
    }
  }
});

/**
 * Streams a static file to the HTTP response with the given content type.
 * Responds 500 if the file cannot be read.
 * @param {http.ServerResponse} res - HTTP response object.
 * @param {string} filePath - Absolute path to the file.
 * @param {string} contentType - MIME type for the Content-Type header.
 */
function serve(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end(String(err)); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/**
 * Sends a JSON-serialized value as an HTTP 200 response.
 * @param {http.ServerResponse} res - HTTP response object.
 * @param {*} data - Value to serialize and send.
 */
function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Resolves the absolute path to the task log file from the loaded config.
 * @param {Object} cfgLocal - Loaded config object.
 * @returns {string} Absolute path to the task log JSON file.
 */
function getTaskLogPath(cfgLocal) {
  const cfgPaths = (cfgLocal.details && (cfgLocal.details.locations || cfgLocal.details.paths)) || cfgLocal.paths || {};
  const rel = cfgPaths['task-log'] || 'project/task-log.json';
  return path.join(DOCS_ROOT, rel);
}

/**
 * Appends a task entry to the task log JSON file, creating it if necessary.
 * Silently ignores write failures.
 * @param {Object} cfgLocal - Loaded config object used to locate the log file.
 * @param {Object} entry - Task entry to append.
 */
function appendTaskLog(cfgLocal, entry) {
  try {
    const logPath = getTaskLogPath(cfgLocal);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    let log = { tasks: [] };
    if (fs.existsSync(logPath)) {
      try {
        log = JSON.parse(stripBom(fs.readFileSync(logPath, 'utf8')));
        if (!Array.isArray(log.tasks)) log.tasks = [];
      } catch {
        log = { tasks: [] };
      }
    }
    log.tasks.push(entry);
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch (err) {
    console.warn(`[WARN] Failed to write task log: ${err.message}`);
  }
}

/**
 * Builds a plain-text prompt string from a command definition, listing its
 * intent, required inputs, outputs, and standard instructions.
 * @param {Object} commandObj - Command definition object.
 * @returns {string} Formatted prompt text.
 */
function buildPrompt(commandObj) {
  if (!commandObj) return '';
  const lines = [];
  lines.push(`Command: ${commandObj.name}`);
  if (commandObj.label) lines.push(`Label: ${commandObj.label}`);
  if (commandObj.intent) lines.push(`Intent: ${commandObj.intent}`);
  lines.push(`Project root: ${DOCS_ROOT}`);
  if (Array.isArray(commandObj.requires) && commandObj.requires.length) {
    lines.push('');
    lines.push('Required inputs:');
    commandObj.requires.forEach(r => lines.push(`- ${r}`));
  }
  if (Array.isArray(commandObj.produces) && commandObj.produces.length) {
    lines.push('');
    lines.push('Outputs:');
    commandObj.produces.forEach(r => lines.push(`- ${r}`));
  }
  if (Array.isArray(commandObj.rules) && commandObj.rules.length) {
    lines.push('');
    lines.push('Rules:');
    commandObj.rules.forEach(r => lines.push(`- ${r}`));
  }
  lines.push('');
  lines.push('Instructions:');
  lines.push('- Do not invent missing upstream artifacts.');
  lines.push('- If inputs are missing or inconsistent, report the gaps.');
  lines.push('- Write outputs only to the declared paths.');
  return lines.join('\n');
}

/**
 * Loads and returns the project configuration via the ConfigurationManager.
 * Returns a minimal fallback object if loading fails.
 * @returns {Object} Loaded config, or a minimal fallback.
 */
function readConfig() {
  try {
    return configManager.load();
  } catch {
    return { details: { paths: {} }, paths: {} };
  }
}

const COMMAND_LOG = path.join(DOCS_ROOT, 'project', 'logs', 'command-log.json');

/**
 * Appends an entry to the command log JSON file, creating it if necessary.
 * Logs a warning on write failure but does not throw.
 * @param {Object} entry - Command log entry to append.
 */
function appendCommandLog(entry) {
  try {
    fs.mkdirSync(path.dirname(COMMAND_LOG), { recursive: true });
    let log = { entries: [] };
    if (fs.existsSync(COMMAND_LOG)) {
      try { log = JSON.parse(fs.readFileSync(COMMAND_LOG, 'utf8')); } catch { /* start fresh */ }
    }
    if (!Array.isArray(log.entries)) log.entries = [];
    log.entries.push(entry);
    fs.writeFileSync(COMMAND_LOG, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    logWarn(`Command log write failed: ${e.message}`);
  }
}

/**
 * Spawns a Node.js child process to run a tool script, captures its output,
 * appends a command-log entry, and invokes the callback with the result.
 * @param {string} cmd - Absolute path to the Node.js script to run.
 * @param {string[]} args - Arguments to pass to the script.
 * @param {function({ code: number, out: string, err: string }): void} cb - Completion callback.
 * @param {Object} [meta={}] - Optional metadata (command name, label) for logging.
 */
function runTool(cmd, args, cb, meta = {}) {
  const { spawn } = require('child_process');
  const startedAt = new Date().toISOString();
  const startMs   = Date.now();
  const child = spawn(process.execPath, [cmd, ...args], { cwd: DOCS_ROOT });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.stderr.on('data', (d) => { err += d.toString(); });
  child.on('close', (code) => {
    const durationMs = Date.now() - startMs;
    appendCommandLog({
      command:     meta.command || path.basename(cmd, '.js').replace(/-/g, '_'),
      label:       meta.label   || meta.command || path.basename(cmd, '.js'),
      ai:          false,
      ran_at:      startedAt,
      duration_ms: durationMs,
      status:      code === 0 ? 'success' : 'failed',
      exit_code:   code,
    });
    cb({ code, out, err });
  });
}

server.listen(PORT, () => {
  console.log(`Design Document Viewer running at http://localhost:${PORT}`);
  console.log(`Docs root: ${DOCS_ROOT}`);
  console.log(`Config: ${cfg['Project-Name'] || '(no project name)'}`);
  if (VIEWER_LOG_LEVEL !== 'warn') {
    console.log(`Viewer log level: ${VIEWER_LOG_LEVEL}`);
  }
});

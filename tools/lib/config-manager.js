const fs = require('fs');
const path = require('path');

class ConfigurationManager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.configArg = options.configArg;
    this.defaultConfigPath = options.defaultConfigPath || 'sample/configuration.json';
    this.configPath = undefined;
    this.configData = undefined;
  }

  static getArgValue(args, name) {
    const prefix = `${name}=`;
    const entry = args.find((arg) => arg.startsWith(prefix));
    return entry ? entry.slice(prefix.length) : undefined;
  }

  static fromArgv(args, options = {}) {
    const configArg = ConfigurationManager.getArgValue(args, '--config');
    return new ConfigurationManager({ ...options, configArg });
  }

  static formatErrorMessage(err) {
    if (err instanceof Error && err.message) return err.message;
    return String(err);
  }

  static stripBom(value) {
    return value.replace(/^\uFEFF/, '');
  }

  readJsonIfExists(resolvedPath) {
    if (!resolvedPath || !fs.existsSync(resolvedPath)) return undefined;
    try {
      return JSON.parse(ConfigurationManager.stripBom(fs.readFileSync(resolvedPath, 'utf8')));
    } catch {
      return undefined;
    }
  }

  hydrateMetaModel(rootConfig) {
    const projectRoot = this.getProjectRoot();
    const meta = (rootConfig.metaModel && typeof rootConfig.metaModel === 'object')
      ? rootConfig.metaModel
      : {};
    const doctypesRel = typeof meta.doctypes === 'string' ? meta.doctypes : undefined;
    const doctypesPath = doctypesRel ? path.resolve(projectRoot, doctypesRel) : undefined;

    const doctypes = this.readJsonIfExists(doctypesPath);
    const merged = { ...rootConfig };

    if (doctypes && typeof doctypes === 'object' && merged.doctypes === undefined) {
      merged.doctypes = doctypes;
    }
    return merged;
  }

  getConfigPath() {
    if (this.configPath) return this.configPath;
    const rawPath = this.configArg || this.defaultConfigPath;
    this.configPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(this.cwd, rawPath);
    return this.configPath;
  }

  getProjectRoot() {
    return path.dirname(this.getConfigPath());
  }

  load() {
    const resolved = this.getConfigPath();
    if (!fs.existsSync(resolved)) {
      throw new Error(`configuration.json missing at ${resolved}`);
    }
    try {
      const parsed = JSON.parse(ConfigurationManager.stripBom(fs.readFileSync(resolved, 'utf8')));
      this.configData = this.hydrateMetaModel(parsed);
      return this.configData;
    } catch (err) {
      const reason = ConfigurationManager.formatErrorMessage(err);
      throw new Error(`Failed to parse configuration.json at ${resolved}: ${reason}`);
    }
  }

  getConfig() {
    return this.configData || this.load();
  }

  getPaths() {
    const data = this.getConfig();
    return (data.details && data.details.locations)
      || (data.details && data.details.paths)
      || data.paths
      || {};
  }

  getProjectFolders() {
    const data = this.getConfig();
    return (data.details && data.details.folders)
      || (data.details && data.details['project-folders'])
      || data['project-folders']
      || {};
  }

  getPatterns() {
    const data = this.getConfig();
    return data.patterns || {};
  }

  getPath(key, fallback) {
    const paths = this.getPaths();
    return paths[key] || fallback;
  }

  resolveProjectPath(value) {
    return path.isAbsolute(value) ? value : path.resolve(this.getProjectRoot(), value);
  }

  validate() {
    const result = { errors: [], warnings: [] };
    const data = this.getConfig();
    const projectRoot = this.getProjectRoot();

    const logError = (msg) => result.errors.push(msg);
    const logWarning = (msg) => result.warnings.push(msg);

    [
      'Methodology',
      'Project-Type',
      'Project-Name',
      'Description',
      'MDT-path',
      'Author',
      'Version',
    ].forEach((key) => {
      if (typeof data[key] !== 'string' || !data[key].trim()) {
        logError(`${key} is required and must be a non-empty string`);
      }
    });

    const ensureObject = (value, label) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        logError(`${label} must be an object`);
        return null;
      }
      return value;
    };

    const details = (data.details && typeof data.details === 'object' && !Array.isArray(data.details))
      ? data.details
      : null;
    const projectFolders = details
      ? ensureObject(
          (details && details.folders) || (details && details['project-folders']) || data['project-folders'],
          'details.folders'
        )
      : null;
    const paths = details
      ? ensureObject(
          (details && details.locations) || (details && details.paths) || data.paths,
          'details.locations'
        )
      : (data.paths !== undefined ? ensureObject(data.paths, 'paths') : null);
    const patterns = ensureObject(data.patterns, 'patterns');

    const checkFilesystemEntries = (entries, label) => {
      if (!entries) return;
      Object.entries(entries).forEach(([key, value]) => {
        if (typeof value !== 'string' || !value.trim()) {
          logError(`${label}.${key} must be a non-empty string`);
          return;
        }
        const target = path.resolve(projectRoot, value);
        if (!fs.existsSync(target)) {
          logWarning(`${label}.${key} points to ${value}, but that path does not exist (yet)`);
          return;
        }
        if (label === 'details.folders' && !fs.statSync(target).isDirectory()) {
          logError(`${label}.${key} should be a directory, but ${value} is not a directory`);
        }
      });
    };

    if (details) {
      checkFilesystemEntries(projectFolders, 'details.folders');
      checkFilesystemEntries(paths, 'details.locations');
    } else {
      checkFilesystemEntries(paths, 'paths');
    }

    if (patterns) {
      Object.entries(patterns).forEach(([key, value]) => {
        if (typeof value !== 'string' || !value.trim()) {
          logError(`patterns.${key} must be a non-empty string`);
          return;
        }
        try {
          new RegExp(value);
        } catch (err) {
          const reason = ConfigurationManager.formatErrorMessage(err);
          logError(`patterns.${key} contains an invalid regular expression: ${reason}`);
        }
      });
    }

    return result;
  }
}

module.exports = { ConfigurationManager };

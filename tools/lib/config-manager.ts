import fs from 'fs';
import path from 'path';

export type ConfigMap = Record<string, unknown>;

export type AppConfiguration = ConfigMap & {
  metaModel?: {
    doctypes?: string;
  };
  details?: {
    folders?: Record<string, string>;
    locations?: Record<string, string>;
    paths?: Record<string, string>;
    ['project-folders']?: Record<string, string>;
  };
  paths?: Record<string, string>;
  ['project-folders']?: Record<string, string>;
  patterns?: Record<string, string>;
};

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type ConfigManagerOptions = {
  cwd?: string;
  configArg?: string;
  defaultConfigPath?: string;
};

export class ConfigurationManager {
  private readonly cwd: string;
  private readonly configArg?: string;
  private readonly defaultConfigPath: string;
  private configPath?: string;
  private configData?: AppConfiguration;

  /** Creates a configuration manager with optional cwd/config overrides. */
  constructor(options: ConfigManagerOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.configArg = options.configArg;
    this.defaultConfigPath = options.defaultConfigPath || 'sample/configuration.json';
  }

  /** Returns the value for a CLI argument in --name=value form. */
  static getArgValue(args: string[], name: string): string | undefined {
    const prefix = `${name}=`;
    const entry = args.find((arg) => arg.startsWith(prefix));
    return entry ? entry.slice(prefix.length) : undefined;
  }

  /** Creates an instance using --config from argv. */
  static fromArgv(args: string[], options: Omit<ConfigManagerOptions, 'configArg'> = {}): ConfigurationManager {
    const configArg = ConfigurationManager.getArgValue(args, '--config');
    return new ConfigurationManager({ ...options, configArg });
  }

  /** Normalizes unknown error values to a safe string for logging/throwing. */
  private static formatErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    return String(err);
  }

  /** Removes UTF-8 BOM prefix to avoid JSON.parse failures on BOM-encoded files. */
  private static stripBom(value: string): string {
    return value.replace(/^\uFEFF/, '');
  }

  /** Reads and parses a JSON file, returning undefined if path is missing or invalid. */
  private readJsonIfExists(resolvedPath?: string): ConfigMap | undefined {
    if (!resolvedPath || !fs.existsSync(resolvedPath)) return undefined;
    try {
      return JSON.parse(ConfigurationManager.stripBom(fs.readFileSync(resolvedPath, 'utf8'))) as ConfigMap;
    } catch {
      return undefined;
    }
  }

  /** Merges metaModel files into root configuration for backward-compatible consumers. */
  private hydrateMetaModel(rootConfig: AppConfiguration): AppConfiguration {
    const projectRoot = this.getProjectRoot();
    const meta = (rootConfig.metaModel && typeof rootConfig.metaModel === 'object')
      ? rootConfig.metaModel
      : {};
    const doctypesRel = typeof meta.doctypes === 'string' ? meta.doctypes : undefined;
    const doctypesPath = doctypesRel ? path.resolve(projectRoot, doctypesRel) : undefined;

    const doctypes = this.readJsonIfExists(doctypesPath);

    const merged: AppConfiguration = { ...rootConfig };
    if (doctypes && typeof doctypes === 'object' && merged.doctypes === undefined) {
      merged.doctypes = doctypes as Record<string, unknown>;
    }
    return merged;
  }

  /** Resolves and caches the absolute configuration path. */
  getConfigPath(): string {
    if (this.configPath) return this.configPath;
    const rawPath = this.configArg || this.defaultConfigPath;
    this.configPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(this.cwd, rawPath);
    return this.configPath;
  }

  /** Returns the project root derived from the config file location. */
  getProjectRoot(): string {
    return path.dirname(this.getConfigPath());
  }

  /** Loads and parses configuration.json from disk and caches the parsed object. */
  load(): AppConfiguration {
    const resolved = this.getConfigPath();
    if (!fs.existsSync(resolved)) {
      throw new Error(`configuration.json missing at ${resolved}`);
    }
    try {
      const raw = fs.readFileSync(resolved, 'utf8');
      const parsed = JSON.parse(ConfigurationManager.stripBom(raw)) as AppConfiguration;
      this.configData = this.hydrateMetaModel(parsed);
      return this.configData;
    } catch (err: unknown) {
      const reason = ConfigurationManager.formatErrorMessage(err);
      throw new Error(`Failed to parse configuration.json at ${resolved}: ${reason}`);
    }
  }

  /** Returns the cached config object or lazily loads it from disk. */
  getConfig(): AppConfiguration {
    return this.configData || this.load();
  }

  /** Returns normalized location mapping with backward-compatible fallbacks. */
  getPaths(): Record<string, string> {
    const data = this.getConfig();
    return (data.details && data.details.locations)
      || (data.details && data.details.paths)
      || data.paths
      || {};
  }

  /** Returns normalized folder mapping with backward-compatible fallbacks. */
  getProjectFolders(): Record<string, string> {
    const data = this.getConfig();
    return (data.details && data.details.folders)
      || (data.details && data.details['project-folders'])
      || data['project-folders']
      || {};
  }

  /** Returns the regex pattern map configured for scanned artifacts. */
  getPatterns(): Record<string, string> {
    const data = this.getConfig();
    return data.patterns || {};
  }

  /** Returns a specific location by key with optional fallback. */
  getPath(key: string, fallback?: string): string | undefined {
    const paths = this.getPaths();
    return paths[key] || fallback;
  }

  /** Resolves a relative path from project root (or returns absolute as-is). */
  resolveProjectPath(value: string): string {
    return path.isAbsolute(value) ? value : path.resolve(this.getProjectRoot(), value);
  }

  /** Performs structural validation for required config fields and filesystem mappings. */
  validate(): ValidationResult {
    const result: ValidationResult = { errors: [], warnings: [] };
    const data = this.getConfig();
    const projectRoot = this.getProjectRoot();

    const logError = (msg: string) => result.errors.push(msg);
    const logWarning = (msg: string) => result.warnings.push(msg);

    const requiredStringKeys = [
      'Methodology',
      'Project-Type',
      'Project-Name',
      'Description',
      'MDT-path',
      'Author',
      'Version',
    ];
    requiredStringKeys.forEach((key) => {
      if (typeof data[key] !== 'string' || !data[key].trim()) {
        logError(`${key} is required and must be a non-empty string`);
      }
    });

    const ensureObject = (value: unknown, label: string): ConfigMap | null => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        logError(`${label} must be an object`);
        return null;
      }
      return value as ConfigMap;
    };

    const details = (data.details && typeof data.details === 'object' && !Array.isArray(data.details))
      ? (data.details as ConfigMap)
      : null;
    const projectFolders = details
      ? ensureObject(
          (details && (details.folders as ConfigMap)) || (details && (details['project-folders'] as ConfigMap)) || data['project-folders'],
          'details.folders'
        )
      : null;
    const paths = details
      ? ensureObject(
          (details && (details.locations as ConfigMap)) || (details && (details.paths as ConfigMap)) || data.paths,
          'details.locations'
        )
      : (data.paths !== undefined ? ensureObject(data.paths, 'paths') : null);
    const patterns = ensureObject(data.patterns, 'patterns');

    const checkFilesystemEntries = (entries: ConfigMap | null, label: string) => {
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
        } catch (err: unknown) {
          const reason = ConfigurationManager.formatErrorMessage(err);
          logError(`patterns.${key} contains an invalid regular expression: ${reason}`);
        }
      });
    }

    return result;
  }
}

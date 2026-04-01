/**
 * MDE Documentation Viewer — Node.js HTTP server
 * Driven by view.json manifest with $config.x.y path resolution and runtime directory scanning.
 *
 * Usage:
 *   ts-node mde/web/viewer.ts --root=<project-root> [--manifest=output/docs/view.json] [--port=4000]
 */

import * as http from 'http';
import * as fs   from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildDashboardData, resolveDashboardFiles } from './ai-mde-dashboard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Manifest types (view.json schema) ─────────────────────────────────────────

interface ScanConfig {
  dir: string;
  pattern: string;
  recursive?: boolean;
  labelFrom?: string;
  sortBy?: string;
  groupBy?: string;
  groupByOrder?: string[];
}

interface ManifestItem {
  id: string;
  label?: string;
  docType?: string;
  file?: string;
  includeIfExists?: boolean;
  scan?: ScanConfig;
  items?: ManifestItem[];
}

interface ManifestSection {
  id: string;
  label: string;
  phase?: string;
  icon?: string;
  items: ManifestItem[];
}

interface DocsManifest {
  title: string;
  version: string;
  config: string;
  sections: ManifestSection[];
}

// ── Resolved tree types (API response) ────────────────────────────────────────

interface TreeDoc {
  id: string;
  label: string;
  file: string;
  docType: string | null;
}

interface TreeGroup {
  id: string;
  label: string;
  docs?: TreeDoc[];
  groups?: TreeGroup[];
}

interface TreeSection {
  id: string;
  label: string;
  phase?: string;
  icon?: string;
  docs?: TreeDoc[];
  groups?: TreeGroup[];
}

// ── DocServer ─────────────────────────────────────────────────────────────────

class DocServer {
  private readonly docsRoot: string;
  private readonly allowedRoots: string[];
  private port = 0;
  private browser: any = null;
  private readonly manifest: DocsManifest;
  private readonly config: Record<string, unknown>;
  private readonly htmlFile: string;
  private readonly cssFile: string;
  private readonly clientFile: string;
  private readonly logLevel: number;

  private static readonly LOG_RANKS: Record<string, number> = {
    silent: 0, error: 1, warn: 2, info: 3, debug: 4,
  };

  constructor(docsRoot: string, manifestRel: string) {
    this.docsRoot = path.resolve(docsRoot);

    const manifestAbs = path.isAbsolute(manifestRel)
      ? manifestRel
      : path.join(this.docsRoot, manifestRel);

    if (!fs.existsSync(manifestAbs)) {
      throw new Error(`Manifest not found: ${manifestAbs}`);
    }

    this.manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8').replace(/^\uFEFF/, '')) as DocsManifest;

    const configAbs = path.join(this.docsRoot, this.manifest.config ?? 'configuration.json');
    if (!fs.existsSync(configAbs)) {
      throw new Error(
        `configuration.json not found at: ${configAbs}\n` +
        `  → All $config.x.y references will fail to resolve.\n` +
        `  → Run with:  ts-node mde/web/viewer.ts --root=<project-root>`
      );
    }
    this.config = JSON.parse(fs.readFileSync(configAbs, 'utf8').replace(/^\uFEFF/, '')) as Record<string, unknown>;

    const mdePath = (this.config as Record<string, Record<string, string>>)?.mde?.path;
    this.allowedRoots = [this.docsRoot];
    if (typeof mdePath === 'string') {
      const mdeRoot = path.resolve(this.docsRoot, mdePath);
      if (mdeRoot !== this.docsRoot) this.allowedRoots.push(mdeRoot);
    }

    this.htmlFile   = path.join(__dirname, 'viewer.html');
    this.cssFile    = path.join(__dirname, 'style.css');
    this.clientFile = path.join(__dirname, 'viewer-client.js');

    const envLevel = (process.env.VIEWER_LOG_LEVEL ?? 'info').toLowerCase();
    this.logLevel  = DocServer.LOG_RANKS[envLevel] ?? DocServer.LOG_RANKS.info;
  }

  // ── Logging ────────────────────────────────────────────────────────────────

  private log(level: 'error' | 'warn' | 'info' | 'debug', msg: string): void {
    if (this.logLevel < (DocServer.LOG_RANKS[level] ?? 0)) return;
    const ts = new Date().toISOString();
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(
      `[viewer ${ts}] ${msg}`
    );
  }

  // ── $config.x.y resolution ─────────────────────────────────────────────────

  private resolveRef(value: string): string {
    return value.replace(/\$config\.([a-zA-Z0-9_.]+)/g, (original, dotPath: string) => {
      const val = this.getConfigAt(dotPath);
      return typeof val === 'string' ? val : original;
    });
  }

  private getConfigAt(dotPath: string): unknown {
    return dotPath.split('.').reduce<unknown>((node, key) => {
      if (node !== null && typeof node === 'object') {
        return (node as Record<string, unknown>)[key];
      }
      return undefined;
    }, this.config);
  }

  // ── Directory scanning ─────────────────────────────────────────────────────

  /**
   * Converts a raw pattern into a RegExp that matches bare filenames.
   * Accepts either a glob (e.g. "uc-*.md" or "ba/use-cases/uc-*.md") or
   * a regex string (e.g. "^module-.*\\.md$").  Regex strings are detected
   * by a leading "^" or trailing "$" and used as-is.
   */
  private toFilenamePattern(rawPattern: string, resolvedDir: string): RegExp {
    // If the pattern is already a regex string, use it directly (before any transformation)
    if (rawPattern.startsWith('^') || rawPattern.endsWith('$')) {
      try { return new RegExp(rawPattern); } catch { return /.*/; }
    }

    // Otherwise treat as a glob: normalise separators, strip dir prefix, then convert to regex
    let pat = rawPattern.replace(/\\/g, '/');
    const dir = resolvedDir.replace(/\\/g, '/').replace(/\/$/, '');
    if (pat.startsWith(dir + '/')) pat = pat.slice(dir.length + 1);
    const reSource = pat.replace(/\./g, '\\.').replace(/\*/g, '.*');
    try {
      return new RegExp(`^${reSource}$`);
    } catch {
      return /.*/;
    }
  }

  private listFlat(absDir: string, pattern: RegExp): string[] {
    try {
      return fs.readdirSync(absDir, { withFileTypes: true })
        .filter(e => e.isFile() && pattern.test(e.name))
        .map(e => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  private listRecursive(absDir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    const stack: string[] = [absDir];
    try {
      while (stack.length) {
        const current = stack.pop()!;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const abs = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(abs);
          } else if (pattern.test(entry.name)) {
            results.push(path.relative(this.docsRoot, abs).replace(/\\/g, '/'));
          }
        }
      }
    } catch { /* ignore unreadable dirs */ }
    return results.sort();
  }

  // ── Label extraction ───────────────────────────────────────────────────────

  private extractLabel(relFile: string, labelFrom: string): string {
    const fallback = path.basename(relFile).replace(/\.[^.]+$/, '');
    if (!labelFrom || labelFrom === 'filename') return fallback;

    const absFile = path.resolve(this.docsRoot, relFile);
    if (!fs.existsSync(absFile)) return fallback;

    try {
      const raw = fs.readFileSync(absFile, 'utf8').replace(/^\uFEFF/, '');
      const ext = path.extname(relFile).toLowerCase();

      if (ext === '.md') {
        const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const titleLine = fmMatch[1].match(/^title:\s*(.+)$/m);
          if (titleLine) return titleLine[1].trim();
        }
        const h1 = raw.match(/^#\s+(.+)$/m);
        if (h1) return h1[1].trim();
      }

      if (ext === '.json') {
        const obj = JSON.parse(raw) as Record<string, unknown>;
        const val = labelFrom.split('.').reduce<unknown>(
          (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
          obj
        );
        if (typeof val === 'string') return val;
      }
    } catch { /* fall through */ }

    return fallback;
  }

  // ── Tree building ──────────────────────────────────────────────────────────

  private docId(relFile: string): string {
    return relFile.replace(/\.[^.]+$/, '').replace(/[/\\]/g, '-');
  }

  private resolveFileItem(item: ManifestItem): TreeDoc | null {
    if (!item.file) return null;
    const file = this.resolveRef(item.file);
    // Skip items whose $config ref did not resolve
    if (file.includes('$config')) return null;
    // Skip optional items whose file doesn't exist on disk
    if (item.includeIfExists && !fs.existsSync(path.resolve(this.docsRoot, file))) return null;
    return {
      id:      item.id,
      label:   item.label ?? path.basename(file).replace(/\.[^.]+$/, ''),
      file,
      docType: item.docType ?? null,
    };
  }

  private resolveInlineGroup(item: ManifestItem): TreeGroup {
    const docs: TreeDoc[] = [];
    for (const child of item.items ?? []) {
      if (child.file) {
        const doc = this.resolveFileItem(child);
        if (doc) docs.push(doc);
      }
    }
    return { id: item.id, label: item.label ?? item.id, docs };
  }

  private resolveScanItem(item: ManifestItem): TreeGroup | null {
    const scan = item.scan!;
    const dir       = this.resolveRef(scan.dir);
    const rawPat    = this.resolveRef(scan.pattern);
    const labelFrom = scan.labelFrom ?? 'filename';
    const docType   = item.docType ?? null;
    const groupBy   = scan.groupBy;
    const absDir    = path.resolve(this.docsRoot, dir);
    const pattern   = this.toFilenamePattern(rawPat, dir);

    const relFiles: string[] = scan.recursive
      ? this.listRecursive(absDir, pattern)
      : this.listFlat(absDir, pattern).map(f => `${dir}/${f}`.replace(/\/\//g, '/'));

    if (!relFiles.length) return null;

    if (groupBy === 'phase') {
      const groupByOrder: string[] = scan.groupByOrder ?? [];
      const byPhase = new Map<string, TreeDoc[]>();
      for (const relFile of relFiles) {
        let phase = 'other';
        try {
          const abs = path.resolve(this.docsRoot, relFile);
          const obj = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')) as Record<string, unknown>;
          if (typeof obj['phase'] === 'string') phase = obj['phase'];
        } catch { /* leave as 'other' */ }
        if (!byPhase.has(phase)) byPhase.set(phase, []);
        byPhase.get(phase)!.push({
          id:      this.docId(relFile),
          label:   this.extractLabel(relFile, labelFrom),
          file:    relFile,
          docType,
        });
      }
      const orderedKeys = [
        ...groupByOrder.filter(k => byPhase.has(k)),
        ...[...byPhase.keys()].filter(k => !groupByOrder.includes(k)).sort(),
      ];
      const subGroups: TreeGroup[] = orderedKeys.map(phase => ({
        id:    `${item.id}-${phase.replace(/[^a-z0-9]/gi, '-')}`,
        label: phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        docs:  byPhase.get(phase)!,
      }));
      return { id: item.id, label: item.label ?? item.id, groups: subGroups };
    }

    if (groupBy === 'parent-folder' || groupBy === 'module-folder') {
      const byFolder = new Map<string, TreeDoc[]>();
      for (const relFile of relFiles) {
        const folder = path.dirname(relFile).replace(/\\/g, '/');
        const doc: TreeDoc = {
          id:      this.docId(relFile),
          label:   this.extractLabel(relFile, labelFrom),
          file:    relFile,
          docType,
        };
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push(doc);
      }

      const subGroups: TreeGroup[] = [];
      for (const [folder, docs] of byFolder) {
        const folderName = folder.split('/').pop() ?? folder;
        subGroups.push({
          id:    `${item.id}-${folderName.replace(/[^a-z0-9]/gi, '-')}`,
          label: folderName,
          docs,
        });
      }
      return { id: item.id, label: item.label ?? item.id, groups: subGroups };
    }

    const docs: TreeDoc[] = relFiles.map(relFile => ({
      id:      this.docId(relFile),
      label:   this.extractLabel(relFile, labelFrom),
      file:    relFile,
      docType,
    }));

    return { id: item.id, label: item.label ?? item.id, docs };
  }

  buildRefIndex(): Record<string, { label: string; description: string; file: string }> {
    const index: Record<string, { label: string; description: string; file: string }> = {};

    const resolveFile = (dotPath: string): string | null => {
      const val = this.getConfigAt(dotPath);
      return typeof val === 'string' ? val : null;
    };

    // Module catalog → MOD-xxx
    const moduleCatalogFile = resolveFile('design.moduleCatalog');
    if (moduleCatalogFile) {
      try {
        const abs = path.resolve(this.docsRoot, moduleCatalogFile);
        if (fs.existsSync(abs)) {
          const data = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
          for (const m of data.catalog?.modules ?? []) {
            if (m.id) index[m.id] = { label: m.name ?? m.id, description: m.description ?? '', file: moduleCatalogFile };
          }
        }
      } catch { /* skip */ }
    }

    // Business functions → BF-xxx
    const bfFile = resolveFile('ba.businessFunctions');
    if (bfFile) {
      try {
        const abs = path.resolve(this.docsRoot, bfFile);
        if (fs.existsSync(abs)) {
          const data = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
          for (const cap of data.capabilities ?? []) {
            for (const fn of cap.functions ?? []) {
              if (fn.id) index[fn.id] = { label: fn.name ?? fn.id, description: fn.description ?? '', file: bfFile };
            }
          }
        }
      } catch { /* skip */ }
    }

    // Entities → ENT-xxx + entity name
    const entitiesDir = resolveFile('design.entities');
    if (entitiesDir) {
      const absDir = path.resolve(this.docsRoot, entitiesDir);
      if (fs.existsSync(absDir)) {
        try {
          for (const f of fs.readdirSync(absDir).filter(f => /^ent-.*\.json$/.test(f))) {
            const relFile = `${entitiesDir}/${f}`.replace(/\/\//g, '/');
            const data = JSON.parse(fs.readFileSync(path.resolve(this.docsRoot, relFile), 'utf8').replace(/^\uFEFF/, ''));
            const ent = data.entity;
            if (!ent) continue;
            const entry = { label: ent.name ?? ent.id, description: ent.description ?? '', file: relFile };
            if (ent.id)   index[ent.id]   = entry;
            if (ent.name) index[ent.name] = entry;
          }
        } catch { /* skip */ }
      }
    }

    // UI catalog → UI-Mxx
    const uiModulesDir = resolveFile('design.uiModules');
    if (uiModulesDir) {
      const uiCatalogFile = `${uiModulesDir}/ui-catalog.json`.replace(/\/\//g, '/');
      const abs = path.resolve(this.docsRoot, uiCatalogFile);
      if (fs.existsSync(abs)) {
        try {
          const data = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
          for (const m of data.modules ?? []) {
            if (m.id) index[m.id] = { label: m.name ?? m.id, description: m.purpose ?? '', file: uiCatalogFile };
          }
        } catch { /* skip */ }
      }
    }

    return index;
  }

  buildTree(): TreeSection[] {
    return this.manifest.sections.map(section => {
      const docs: TreeDoc[]   = [];
      const groups: TreeGroup[] = [];

      for (const item of section.items ?? []) {
        if (item.scan) {
          const group = this.resolveScanItem(item);
          if (group) groups.push(group);
        } else if (item.file) {
          const doc = this.resolveFileItem(item);
          if (doc) docs.push(doc);
        } else if (item.items) {
          groups.push(this.resolveInlineGroup(item));
        }
      }

      const result: TreeSection = {
        id:    section.id,
        label: section.label,
        phase: section.phase,
        icon:  section.icon,
      };
      if (docs.length)   result.docs   = docs;
      if (groups.length) result.groups = groups;
      return result;
    });
  }

  // ── HTTP helpers ───────────────────────────────────────────────────────────

  private sendJson(res: http.ServerResponse, data: unknown, status = 200): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(JSON.stringify(data));
  }

  private serveStatic(res: http.ServerResponse, filePath: string, contentType: string): void {
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(500); res.end(String(err)); return; }
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  }

  private isWithinRoot(absPath: string): boolean {
    return this.allowedRoots.some(root => absPath === root || absPath.startsWith(root + path.sep));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise(resolve => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
    });
  }

  private isDirectory(absPath: string): boolean {
    try {
      return fs.existsSync(absPath) && fs.statSync(absPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Resolves a requested doc path to an actual readable file.
   * If the request points to a directory, tries common index files.
   */
  private resolveDocReadTarget(absPath: string): { absFile: string; renderedFrom?: string } | null {
    if (!fs.existsSync(absPath)) return null;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(absPath);
    } catch {
      return null;
    }

    if (stat.isFile()) return { absFile: absPath };
    if (!stat.isDirectory()) return null;

    const candidates = ['index.md', 'README.md', 'index.json'];
    for (const name of candidates) {
      const candidate = path.join(absPath, name);
      if (fs.existsSync(candidate)) {
        const rel = path.relative(this.docsRoot, candidate).replace(/\\/g, '/');
        return { absFile: candidate, renderedFrom: rel };
      }
    }
    return null;
  }

  private buildDirectoryIndexMarkdown(absDir: string, relDir: string): string {
    const relBase = relDir.replace(/\\/g, '/').replace(/\/+$/, '');
    const entries = fs.readdirSync(absDir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const lines: string[] = [];
    lines.push(`# ${path.basename(absDir) || relBase || 'Directory'}`);
    lines.push('');
    lines.push(`Generated index for \`${relBase || '/'}\``);
    lines.push('');

    for (const e of entries) {
      const target = `${relBase}/${e.name}`.replace(/\/+/g, '/');
      const label = e.isDirectory() ? `${e.name}/` : e.name;
      const href = e.isDirectory() ? `${target}/` : target;
      lines.push(`- [${label}](${href})`);
    }

    if (entries.length === 0) {
      lines.push('_This folder is empty._');
    }
    lines.push('');
    return lines.join('\n');
  }

  // ── Request handler ────────────────────────────────────────────────────────

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://localhost`);
    this.log('debug', `${req.method} ${url.pathname}`);
    console.log(`request : ${req.method} ${url.pathname}`);
    try {
      // ── Static assets ──
      if (url.pathname === '/' || url.pathname === '/viewer.html' || url.pathname === '/erd-demo.html') {
        return this.serveStatic(res, this.htmlFile, 'text/html');
      }
      if (url.pathname === '/style.css') {
        return this.serveStatic(res, this.cssFile, 'text/css');
      }
     if (url.pathname === '/favicon.png' || url.pathname === '/favicon.ico') {
          return this.serveStatic(res, path.join(__dirname, 'favicon.png'), 'image/png');
      }

      if (url.pathname === '/viewer-client.js') {
        return this.serveStatic(res, this.clientFile, 'text/javascript');
      }

      // ── API ──
      if (url.pathname === '/api/manifest') {
        return this.sendJson(res, this.manifest);
      }

      if (url.pathname === '/api/config') {
        return this.sendJson(res, this.config);
      }

      if (url.pathname === '/api/tree') {
        return this.sendJson(res, this.buildTree());
      }

      if (url.pathname === '/api/ref-index') {
        return this.sendJson(res, this.buildRefIndex());
      }

      if (url.pathname.startsWith('/api/image/')) {
        const relPath = decodeURIComponent(url.pathname.slice('/api/image/'.length));
        const absPath = path.resolve(this.docsRoot, relPath);
        if (!this.isWithinRoot(absPath)) { res.writeHead(403); res.end('Forbidden'); return; }
        if (!fs.existsSync(absPath))     { res.writeHead(404); res.end('Not found'); return; }
        const data = fs.readFileSync(absPath);
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': data.length });
        res.end(data);
        return;
      }

      if (url.pathname === '/api/screenshots') {
        const screensRelDir = (this.config as any)?.screenshots?.outputDir ?? 'docs/screens';
        const screensDir = path.resolve(this.docsRoot, screensRelDir);
        if (!fs.existsSync(screensDir)) { return this.sendJson(res, []); }
        const files = fs.readdirSync(screensDir)
          .filter(f => f.endsWith('.png'))
          .sort()
          .map(f => `${screensRelDir}/${f}`);
        return this.sendJson(res, files);
      }

      if (url.pathname === '/api/screenshot') {
        const targetUrl = url.searchParams.get('url');
        const filename  = url.searchParams.get('filename') || 'page';
        if (!targetUrl) { res.writeHead(400); res.end('Missing url param'); return; }
        try {
          const screensRelDir = (this.config as any)?.screenshots?.outputDir ?? 'docs/screens';
          const screensDir = path.resolve(this.docsRoot, screensRelDir);
          fs.mkdirSync(screensDir, { recursive: true });
          const png      = await this.takeScreenshot(targetUrl);
          const filePath = path.join(screensDir, `${filename}.png`);
          fs.writeFileSync(filePath, png);
          const relPath  = path.relative(this.docsRoot, filePath).replace(/\\/g, '/');
          this.sendJson(res, { saved: relPath });
        } catch (err: any) {
          this.log('error', `Screenshot failed: ${err.message}`);
          res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (url.pathname === '/api/dashboard') {
        const files = resolveDashboardFiles(this.docsRoot, this.config);
        return this.sendJson(res, buildDashboardData(files));
      }

      if (url.pathname.startsWith('/api/template/')) {
        const name = path.basename(decodeURIComponent(url.pathname.slice('/api/template/'.length)));
        const tplPath = path.join(__dirname, '..', 'templates', name);
        if (!fs.existsSync(tplPath)) { res.writeHead(404); res.end('Template not found'); return; }
        const content = fs.readFileSync(tplPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(content);
        return;
      }

      if (url.pathname === '/api/catalog') {
        const catalogPath = path.join(__dirname, '..', 'methodology', 'document-catalog.json');
        if (!fs.existsSync(catalogPath)) {
          return this.sendJson(res, { document_types: [] });
        }
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        return this.sendJson(res, catalog);
      }

      if (url.pathname.startsWith('/api/doc/')) {
        const relPath = decodeURIComponent(url.pathname.slice('/api/doc/'.length));
        const absPath = path.resolve(this.docsRoot, relPath);

        if (!this.isWithinRoot(absPath)) {
          res.writeHead(403); res.end('Forbidden'); return;
        }

        if (req.method === 'GET') {
          const target = this.resolveDocReadTarget(absPath);
          if (!target) {
            if (this.isDirectory(absPath)) {
              const dirIndex = this.buildDirectoryIndexMarkdown(absPath, relPath);
              this.sendJson(res, { content: dirIndex, ext: 'md', renderedFrom: relPath });
              return;
            }
            res.writeHead(404); res.end('Not found'); return;
          }

          fs.readFile(target.absFile, 'utf8', (err, data) => {
            if (err) { res.writeHead(404); res.end('Not found'); return; }
            const content = data.replace(/^\uFEFF/, '');
            const ext = path.extname(target.absFile).slice(1);
            this.sendJson(res, {
              content,
              ext,
              ...(target.renderedFrom ? { renderedFrom: target.renderedFrom } : {}),
            });
          });
          return;
        }

        if (req.method === 'PUT') {
          const body = await this.readBody(req);
          try {
            const { content } = JSON.parse(body) as { content: string };
            fs.writeFile(absPath, content, 'utf8', err => {
              if (err) { res.writeHead(500); res.end(String(err)); return; }
              this.sendJson(res, { ok: true });
            });
          } catch {
            res.writeHead(400); res.end('Bad JSON');
          }
          return;
        }

        res.writeHead(405); res.end();
        return;
      }

      res.writeHead(404); res.end();

    } catch (err) {
      this.log('error', `Request error: ${(err as Error).message}`);
      if (!res.headersSent) res.writeHead(500);
      if (!res.writableEnded) res.end(JSON.stringify({ error: 'internal_server_error' }));
    }
  }

  // ── Screenshot (dev) ──────────────────────────────────────────────────────

  private async getBrowser(): Promise<any> {
    if (!this.browser || !this.browser.isConnected()) {
      const { chromium } = await import('@playwright/test');
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async takeScreenshot(targetUrl: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page    = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
      // Derive origin and perform mock login first
      const parsed   = new URL(targetUrl);
      const loginUrl = `${parsed.origin}/login`;
      await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL((url: URL) => !url.toString().includes('/login'), { timeout: 10000 });
      // Navigate to the actual target
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      return await page.screenshot({ fullPage: true });
    } finally {
      await page.close();
    }
  }

  // ── Server lifecycle ───────────────────────────────────────────────────────

  listen(port: number): void {
    this.port = port;
    const server = http.createServer((req, res) => {
      this.handle(req, res).catch(err => {
        this.log('error', `Unhandled: ${(err as Error).message}`);
        if (!res.headersSent) res.writeHead(500);
        if (!res.writableEnded) res.end();
      });
    });

    process.on('uncaughtException', err => { this.log('error', err.message); process.exit(1); });
    process.on('unhandledRejection', err => { this.log('error', String(err)); process.exit(1); });

    server.listen(port, () => {
      console.log(`Doc Viewer  →  http://localhost:${port}`);
      console.log(`Project     →  ${this.docsRoot}`);
      console.log(`Manifest    →  ${this.manifest.title}  v${this.manifest.version}`);
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function parseArg(prefix: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

console.log(process.argv.join(' '));
const  rootParam = parseArg('--root=');

console.log(`[viewer] Starting up...from ${rootParam}`);

const PORT      = parseInt(parseArg('--port=') ?? process.env.VIEWER_PORT ?? '4000', 10);
const DOCS_ROOT = path.resolve(rootParam ?? process.cwd());
// Manifest lives beside viewer.ts in the MDE web folder — no project-side copy needed
const MANIFEST  = parseArg('--manifest=') ?? path.join(__dirname, 'view.json');

console.log(`[viewer] Starting with root: ${DOCS_ROOT}`);

if (!fs.existsSync(DOCS_ROOT)) {
  console.error(`[viewer] Project root does not exist: ${DOCS_ROOT}`);
  console.error(`[viewer] Usage: ts-node mde/web/viewer.ts --root=<project-root>`);
  process.exit(1);
}

const manifestAbs = path.isAbsolute(MANIFEST) ? MANIFEST : path.join(DOCS_ROOT, MANIFEST);
if (!fs.existsSync(manifestAbs)) {
  console.error(`[viewer] Manifest not found: ${manifestAbs}`);
  console.error(`[viewer] Expected: ${path.join(__dirname, 'view.json')}`);
  process.exit(1);
}

try {
  new DocServer(DOCS_ROOT, MANIFEST).listen(PORT);
  } catch (err) {
  console.error(`[viewer] Error: ${(err as Error).message}`);
  process.exit(1);
}

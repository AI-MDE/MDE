"use strict";
/**
 * MDE Documentation Viewer — Node.js HTTP server
 * Driven by view.json manifest with $config.x.y path resolution and runtime directory scanning.
 *
 * Usage:
 *   ts-node mde/web/viewer.ts --root=<project-root> [--manifest=output/docs/view.json] [--port=4000]
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ── DocServer ─────────────────────────────────────────────────────────────────
class DocServer {
    constructor(docsRoot, manifestRel) {
        this.docsRoot = path.resolve(docsRoot);
        const manifestAbs = path.isAbsolute(manifestRel)
            ? manifestRel
            : path.join(this.docsRoot, manifestRel);
        if (!fs.existsSync(manifestAbs)) {
            throw new Error(`Manifest not found: ${manifestAbs}`);
        }
        this.manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8'));
        const configAbs = path.join(this.docsRoot, this.manifest.config ?? 'configuration.json');
        if (!fs.existsSync(configAbs)) {
            throw new Error(`configuration.json not found at: ${configAbs}\n` +
                `  → All $config.x.y references will fail to resolve.\n` +
                `  → Run with:  ts-node mde/web/viewer.ts --root=<project-root>`);
        }
        this.config = JSON.parse(fs.readFileSync(configAbs, 'utf8'));
        this.htmlFile = path.join(__dirname, 'viewer.html');
        this.cssFile = path.join(__dirname, 'style.css');
        this.clientFile = path.join(__dirname, 'viewer-client.js');
        const envLevel = (process.env.VIEWER_LOG_LEVEL ?? 'info').toLowerCase();
        this.logLevel = DocServer.LOG_RANKS[envLevel] ?? DocServer.LOG_RANKS.info;
    }
    // ── Logging ────────────────────────────────────────────────────────────────
    log(level, msg) {
        if (this.logLevel < (DocServer.LOG_RANKS[level] ?? 0))
            return;
        const ts = new Date().toISOString();
        (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(`[viewer ${ts}] ${msg}`);
    }
    // ── $config.x.y resolution ─────────────────────────────────────────────────
    resolveRef(value) {
        return value.replace(/\$config\.([a-zA-Z0-9_.]+)/g, (original, dotPath) => {
            const val = this.getConfigAt(dotPath);
            return typeof val === 'string' ? val : original;
        });
    }
    getConfigAt(dotPath) {
        return dotPath.split('.').reduce((node, key) => {
            if (node !== null && typeof node === 'object') {
                return node[key];
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
    toFilenamePattern(rawPattern, resolvedDir) {
        // If the pattern is already a regex string, use it directly (before any transformation)
        if (rawPattern.startsWith('^') || rawPattern.endsWith('$')) {
            try {
                return new RegExp(rawPattern);
            }
            catch {
                return /.*/;
            }
        }
        // Otherwise treat as a glob: normalise separators, strip dir prefix, then convert to regex
        let pat = rawPattern.replace(/\\/g, '/');
        const dir = resolvedDir.replace(/\\/g, '/').replace(/\/$/, '');
        if (pat.startsWith(dir + '/'))
            pat = pat.slice(dir.length + 1);
        const reSource = pat.replace(/\./g, '\\.').replace(/\*/g, '.*');
        try {
            return new RegExp(`^${reSource}$`);
        }
        catch {
            return /.*/;
        }
    }
    listFlat(absDir, pattern) {
        try {
            return fs.readdirSync(absDir, { withFileTypes: true })
                .filter(e => e.isFile() && pattern.test(e.name))
                .map(e => e.name)
                .sort();
        }
        catch {
            return [];
        }
    }
    listRecursive(absDir, pattern) {
        const results = [];
        const stack = [absDir];
        try {
            while (stack.length) {
                const current = stack.pop();
                for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                    const abs = path.join(current, entry.name);
                    if (entry.isDirectory()) {
                        stack.push(abs);
                    }
                    else if (pattern.test(entry.name)) {
                        results.push(path.relative(this.docsRoot, abs).replace(/\\/g, '/'));
                    }
                }
            }
        }
        catch { /* ignore unreadable dirs */ }
        return results.sort();
    }
    // ── Label extraction ───────────────────────────────────────────────────────
    extractLabel(relFile, labelFrom) {
        const fallback = path.basename(relFile).replace(/\.[^.]+$/, '');
        if (!labelFrom || labelFrom === 'filename')
            return fallback;
        const absFile = path.join(this.docsRoot, relFile);
        if (!fs.existsSync(absFile))
            return fallback;
        try {
            const raw = fs.readFileSync(absFile, 'utf8').replace(/^\uFEFF/, '');
            const ext = path.extname(relFile).toLowerCase();
            if (ext === '.md') {
                const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
                if (fmMatch) {
                    const titleLine = fmMatch[1].match(/^title:\s*(.+)$/m);
                    if (titleLine)
                        return titleLine[1].trim();
                }
                const h1 = raw.match(/^#\s+(.+)$/m);
                if (h1)
                    return h1[1].trim();
            }
            if (ext === '.json') {
                const obj = JSON.parse(raw);
                const val = labelFrom.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), obj);
                if (typeof val === 'string')
                    return val;
            }
        }
        catch { /* fall through */ }
        return fallback;
    }
    // ── Tree building ──────────────────────────────────────────────────────────
    docId(relFile) {
        return relFile.replace(/\.[^.]+$/, '').replace(/[/\\]/g, '-');
    }
    resolveFileItem(item) {
        if (!item.file)
            return null;
        const file = this.resolveRef(item.file);
        // Skip items whose $config ref did not resolve
        if (file.includes('$config'))
            return null;
        // Skip optional items whose file doesn't exist on disk
        if (item.includeIfExists && !fs.existsSync(path.join(this.docsRoot, file)))
            return null;
        return {
            id: item.id,
            label: item.label ?? path.basename(file).replace(/\.[^.]+$/, ''),
            file,
            docType: item.docType ?? null,
        };
    }
    resolveInlineGroup(item) {
        const docs = [];
        for (const child of item.items ?? []) {
            if (child.file) {
                const doc = this.resolveFileItem(child);
                if (doc)
                    docs.push(doc);
            }
        }
        return { id: item.id, label: item.label ?? item.id, docs };
    }
    resolveScanItem(item) {
        const scan = item.scan;
        const dir = this.resolveRef(scan.dir);
        const rawPat = this.resolveRef(scan.pattern);
        const labelFrom = scan.labelFrom ?? 'filename';
        const docType = item.docType ?? null;
        const groupBy = scan.groupBy;
        const absDir = path.join(this.docsRoot, dir);
        const pattern = this.toFilenamePattern(rawPat, dir);
        const relFiles = scan.recursive
            ? this.listRecursive(absDir, pattern)
            : this.listFlat(absDir, pattern).map(f => `${dir}/${f}`.replace(/\/\//g, '/'));
        if (!relFiles.length)
            return null;
        if (groupBy === 'parent-folder' || groupBy === 'module-folder') {
            const byFolder = new Map();
            for (const relFile of relFiles) {
                const folder = path.dirname(relFile).replace(/\\/g, '/');
                const doc = {
                    id: this.docId(relFile),
                    label: this.extractLabel(relFile, labelFrom),
                    file: relFile,
                    docType,
                };
                if (!byFolder.has(folder))
                    byFolder.set(folder, []);
                byFolder.get(folder).push(doc);
            }
            const subGroups = [];
            for (const [folder, docs] of byFolder) {
                const folderName = folder.split('/').pop() ?? folder;
                subGroups.push({
                    id: `${item.id}-${folderName.replace(/[^a-z0-9]/gi, '-')}`,
                    label: folderName,
                    docs,
                });
            }
            return { id: item.id, label: item.label ?? item.id, groups: subGroups };
        }
        const docs = relFiles.map(relFile => ({
            id: this.docId(relFile),
            label: this.extractLabel(relFile, labelFrom),
            file: relFile,
            docType,
        }));
        return { id: item.id, label: item.label ?? item.id, docs };
    }
    buildTree() {
        return this.manifest.sections.map(section => {
            const docs = [];
            const groups = [];
            for (const item of section.items ?? []) {
                if (item.scan) {
                    const group = this.resolveScanItem(item);
                    if (group)
                        groups.push(group);
                }
                else if (item.file) {
                    const doc = this.resolveFileItem(item);
                    if (doc)
                        docs.push(doc);
                }
                else if (item.items) {
                    groups.push(this.resolveInlineGroup(item));
                }
            }
            const result = {
                id: section.id,
                label: section.label,
                phase: section.phase,
                icon: section.icon,
            };
            if (docs.length)
                result.docs = docs;
            if (groups.length)
                result.groups = groups;
            return result;
        });
    }
    // ── HTTP helpers ───────────────────────────────────────────────────────────
    sendJson(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
    serveStatic(res, filePath, contentType) {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end(String(err));
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }
    isWithinRoot(absPath) {
        const root = path.resolve(this.docsRoot);
        return absPath === root || absPath.startsWith(root + path.sep);
    }
    readBody(req) {
        return new Promise(resolve => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => resolve(body));
        });
    }
    // ── Request handler ────────────────────────────────────────────────────────
    async handle(req, res) {
        const url = new URL(req.url ?? '/', `http://localhost`);
        this.log('debug', `${req.method} ${url.pathname}`);
        try {
            // ── Static assets ──
            if (url.pathname === '/' || url.pathname === '/viewer.html') {
                return this.serveStatic(res, this.htmlFile, 'text/html');
            }
            if (url.pathname === '/style.css') {
                return this.serveStatic(res, this.cssFile, 'text/css');
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
            if (url.pathname.startsWith('/api/template/')) {
                const name = path.basename(decodeURIComponent(url.pathname.slice('/api/template/'.length)));
                const tplPath = path.join(__dirname, '..', 'templates', name);
                if (!fs.existsSync(tplPath)) {
                    res.writeHead(404);
                    res.end('Template not found');
                    return;
                }
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
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                if (req.method === 'GET') {
                    fs.readFile(absPath, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(404);
                            res.end('Not found');
                            return;
                        }
                        const content = data.replace(/^\uFEFF/, '');
                        const ext = path.extname(absPath).slice(1);
                        this.sendJson(res, { content, ext });
                    });
                    return;
                }
                if (req.method === 'PUT') {
                    const body = await this.readBody(req);
                    try {
                        const { content } = JSON.parse(body);
                        fs.writeFile(absPath, content, 'utf8', err => {
                            if (err) {
                                res.writeHead(500);
                                res.end(String(err));
                                return;
                            }
                            this.sendJson(res, { ok: true });
                        });
                    }
                    catch {
                        res.writeHead(400);
                        res.end('Bad JSON');
                    }
                    return;
                }
                res.writeHead(405);
                res.end();
                return;
            }
            res.writeHead(404);
            res.end();
        }
        catch (err) {
            this.log('error', `Request error: ${err.message}`);
            if (!res.headersSent)
                res.writeHead(500);
            if (!res.writableEnded)
                res.end(JSON.stringify({ error: 'internal_server_error' }));
        }
    }
    // ── Server lifecycle ───────────────────────────────────────────────────────
    listen(port) {
        const server = http.createServer((req, res) => {
            this.handle(req, res).catch(err => {
                this.log('error', `Unhandled: ${err.message}`);
                if (!res.headersSent)
                    res.writeHead(500);
                if (!res.writableEnded)
                    res.end();
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
DocServer.LOG_RANKS = {
    silent: 0, error: 1, warn: 2, info: 3, debug: 4,
};
// ── Bootstrap ─────────────────────────────────────────────────────────────────
function parseArg(prefix) {
    const arg = process.argv.find(a => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : undefined;
}
console.log(process.argv.join(' '));
const rootParam = parseArg('--root=');
console.log(`[viewer] Starting up...from ${rootParam}`);
const PORT = parseInt(parseArg('--port=') ?? process.env.VIEWER_PORT ?? '4000', 10);
const DOCS_ROOT = path.resolve(rootParam ?? process.cwd());
// Manifest lives beside viewer.ts in the MDE web folder — no project-side copy needed
const MANIFEST = parseArg('--manifest=') ?? path.join(__dirname, 'view.json');
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
}
catch (err) {
    console.error(`[viewer] Error: ${err.message}`);
    process.exit(1);
}

#!/usr/bin/env node
/**
 * Purpose: Runs document viewer tests to validate document loading and rendering behavior.
 */
'use strict';

/**
 * test-viewer-docs.js
 * Comprehensive viewer document test:
 *   1. Every doc in /api/tree fetches OK (no 404)
 *   2. JSON docs are valid JSON and non-empty
 *   3. Markdown docs are non-empty
 *   4. JSONL docs have parseable lines
 *   5. Every templateRef in the catalog is fetchable and Mustache-parseable
 *   6. Template-tier docs render without error (server-side Mustache trial)
 *   7. Every docType in the tree has a catalog entry
 *
 * Usage:
 *   node tools/test-viewer-docs.js --project=<path> [--port=4000] [--no-start]
 */

const http = require('http');
const path = require('path');
const cp   = require('child_process');

const MDE_ROOT = path.resolve(__dirname, '..');
const PROJECT  = process.argv.find(a => a.startsWith('--project='))
  ? path.resolve(process.argv.find(a => a.startsWith('--project=')).replace('--project=', ''))
  : process.cwd();
const PORT     = parseInt((process.argv.find(a => a.startsWith('--port=')) || '--port=4000').replace('--port=', ''), 10);
const NO_START = process.argv.includes('--no-start');

// Mustache is optional — template rendering tests skip if not installed
let Mustache;
try { Mustache = require('mustache'); } catch (_) { Mustache = null; }

// ── Counters ──────────────────────────────────────────────────────────────────
let errors = 0, warnings = 0, passed = 0;
function ok(msg)   { console.log  (`    [OK]   ${msg}`); passed++;   }
function err(msg)  { console.error(`    [ERR]  ${msg}`); errors++;   }
function warn(msg) { console.warn (`    [WARN] ${msg}`); warnings++; }
function info(msg) { console.log  (`    [...]  ${msg}`); }

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: 'localhost', port: PORT, path: urlPath }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitForViewer(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try { const r = await get('/api/tree'); if (r.status === 200) return true; } catch (_) {}
    await sleep(500);
  }
  return false;
}

// ── Tree walking ──────────────────────────────────────────────────────────────
function collectDocs(node, docs = []) {
  if (node.file || node.path) docs.push(node);
  const children = [...(node.items || []), ...(node.docs || []), ...(node.groups || [])];
  for (const child of children) collectDocs(child, docs);
  return docs;
}

// ── Render-tier classification (mirrors viewer-client.js logic) ───────────────
const CODE_FORMATS = new Set(['code','ts','tsx','js','jsx','css','py','rb','go','java','cs','cpp','c','sh','txt','sql']);

function renderTier(doc, catalogEntry, ext) {
  const docType = doc.docType;
  if (!catalogEntry) return { tier: 'unknown', note: 'not in catalog' };
  if (catalogEntry.renderMode === 'virtual') return { tier: 'virtual' };
  // templateRef only applies to JSON-format docs (md templateRef = AI guide only)
  if (catalogEntry.templateRef && catalogEntry.format === 'json')
                                             return { tier: 'template', templateRef: catalogEntry.templateRef };
  // complex custom types
  const CUSTOM = ['root-configuration','application','project-state','command-log',
                  'logical-data-model','module-catalog','module-spec','entity','trace-matrix'];
  if (CUSTOM.includes(docType))              return { tier: 'custom' };
  const fmt = catalogEntry.format;
  if (fmt === 'md')                          return { tier: 'format', format: 'md' };
  if (fmt === 'jsonl')                       return { tier: 'format', format: 'jsonl' };
  // source code and plain text — use ext or format
  if (CODE_FORMATS.has(fmt) || CODE_FORMATS.has(ext))
                                             return { tier: 'format', format: ext || fmt };
  return { tier: 'json-fallback' };
}

// ── normalizeForTemplate (mirrors viewer-client.js) ───────────────────────────
function normalizeForTemplate(docType, data, doc) {
  if (docType === 'sample-data') {
    const rows  = Array.isArray(data) ? data : (data.rows || data.data || []);
    const title = Array.isArray(data) ? (doc.label || 'Sample Data') : (data.entity || doc.label || 'Sample Data');
    if (!rows.length) return { title, count: 0, header: '', separator: '', rows: [] };
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const esc  = s => String(s ?? '').replace(/\|/g, '\\|');
    return {
      title, count: rows.length,
      header:    '| ' + cols.map(esc).join(' | ') + ' |',
      separator: '| ' + cols.map(() => '---').join(' | ') + ' |',
      rows: rows.map(r => ({ cells: '| ' + cols.map(c => esc(r[c])).join(' | ') + ' |' })),
    };
  }
  if (docType === 'business-functions') {
    const caps = data.capabilities || [];
    return {
      title: data.application || 'Business Functions',
      items: caps.map(cap => ({
        id: cap.id, name: cap.name, description: cap.description || '',
        children: (cap.functions || []).map(fn => ({
          id: fn.id, name: fn.name, parentId: fn.parent_id || '',
          outcomes: (fn.outcomes || []).map(o => ({ '.': o })),
        })),
      })),
    };
  }
  return data;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  let viewer;

  if (!NO_START) {
    const viewerJs = path.join(MDE_ROOT, 'web', 'viewer.js');
    console.log(`\nStarting viewer on port ${PORT} for project: ${PROJECT}`);
    viewer = cp.spawn(process.execPath, [viewerJs, `--root=${PROJECT}`, `--port=${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    viewer.stdout.on('data', d => process.stdout.write(`  [viewer] ${d}`));
    viewer.stderr.on('data', d => process.stderr.write(`  [viewer] ${d}`));
  }

  console.log('Waiting for viewer...');
  if (!await waitForViewer()) {
    err('Viewer did not start in time.');
    if (viewer) viewer.kill();
    process.exit(1);
  }

  // ── Load tree + catalog ─────────────────────────────────────────────────────
  let tree, catalogData;
  try {
    const [treeRes, catRes] = await Promise.all([get('/api/tree'), get('/api/catalog')]);
    tree        = JSON.parse(treeRes.body);
    catalogData = JSON.parse(catRes.body);
  } catch (e) {
    err(`Failed to load tree/catalog: ${e.message}`);
    if (viewer) viewer.kill();
    process.exit(1);
  }

  const catalog = {};
  for (const dt of (catalogData.document_types || [])) catalog[dt.id] = dt;

  const sections = Array.isArray(tree) ? tree : (tree.sections || []);
  const allDocs  = [];
  for (const s of sections) collectDocs(s, allDocs);
  console.log(`\nFound ${allDocs.length} document(s), ${Object.keys(catalog).length} catalog entries.\n`);

  // ── Template inventory ──────────────────────────────────────────────────────
  console.log('── Template inventory ──');
  // Only check templateRefs that are used for rendering (json-format docs)
  const templateRefs = new Set(
    Object.values(catalog)
      .filter(e => e.templateRef && e.format === 'json')
      .map(e => e.templateRef)
  );
  const fetchedTemplates = {};

  for (const tplName of [...templateRefs].sort()) {
    let res;
    try { res = await get(`/api/template/${encodeURIComponent(tplName)}`); }
    catch (e) { err(`template ${tplName}: fetch failed — ${e.message}`); continue; }

    if (res.status !== 200) { err(`template ${tplName}: HTTP ${res.status}`); continue; }
    if (!res.body.trim())   { err(`template ${tplName}: empty`);              continue; }

    // Validate Mustache syntax
    if (Mustache) {
      try { Mustache.parse(res.body); }
      catch (e) { err(`template ${tplName}: invalid Mustache — ${e.message}`); continue; }
    }

    fetchedTemplates[tplName] = res.body;
    ok(`${tplName} (${res.body.length} chars)`);
  }

  // ── Document checks ─────────────────────────────────────────────────────────
  console.log('\n── Documents ──');

  // infer docType from file path if not set (mirrors PATTERN_DOCTYPE in client)
  function inferDocType(doc) {
    if (doc.docType) return doc.docType;
    const f = doc.file || '';
    if (f.match(/\/ent-[^/]+\.json$/))            return 'entity';
    if (f.match(/\/module-[^/]+\.json$/))          return 'module-spec';
    if (f.match(/\/sample-data\/[^/]+\.json$/))    return 'sample-data';
    if (doc.id === 'erd')                          return 'erd';
    if (doc.id === 'entity-catalogue')             return 'entity-catalogue';
    return null;
  }

  for (const doc of allDocs) {
    const filePath = doc.file || doc.path;
    if (!filePath) continue;

    const docType      = inferDocType(doc);
    const catalogEntry = docType ? catalog[docType] : null;
    const label        = doc.id || filePath;

    // Fetch the file first so we have ext for tier resolution
    const encoded = filePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
    let res;
    try { res = await get(`/api/doc/${encoded}`); }
    catch (e) { console.log(`\n  ${label}  [${docType || '?'}]`); err(`fetch failed — ${e.message}`); continue; }

    if (res.status === 404) {
      console.log(`\n  ${label}  [${docType || '?'}]`);
      if (doc.includeIfExists || catalogEntry?.status === 'optional') {
        warn(`404 (optional)`);
      } else {
        err(`404 — file missing`);
      }
      continue;
    }
    if (res.status !== 200) {
      console.log(`\n  ${label}  [${docType || '?'}]`);
      err(`HTTP ${res.status}`); continue;
    }

    // Parse response envelope
    let envelope;
    try { envelope = JSON.parse(res.body); }
    catch (e) { console.log(`\n  ${label}  [${docType || '?'}]`); err(`response envelope invalid JSON: ${e.message}`); continue; }

    const { content, ext } = envelope;
    const tier = renderTier(doc, catalogEntry, ext);

    console.log(`\n  ${label}  [${docType || '?'}] → tier:${tier.tier}`);

    if (!content || !content.trim()) { err(`empty content`); continue; }
    ok(`fetch OK — ${content.length} chars, ext=${ext}`);

    // ── Tier-specific validation ──────────────────────────────────────────────

    if (tier.tier === 'virtual') {
      // Virtual docs have no file content to validate
      ok(`virtual — no content validation needed`);
      continue;
    }

    if (tier.tier === 'template') {
      const tplName = tier.templateRef;
      const tpl     = fetchedTemplates[tplName];
      if (!tpl) { err(`templateRef "${tplName}" not available (fetch failed above)`); continue; }

      // Content must be valid JSON for template rendering
      let data;
      try { data = JSON.parse(content); }
      catch (e) { err(`JSON parse failed (needed for template render): ${e.message}`); continue; }
      ok(`JSON valid`);

      // Trial Mustache render
      if (Mustache) {
        try {
          const normalized = normalizeForTemplate(docType, data, doc);
          const out = Mustache.render(tpl, normalized);
          if (!out.trim()) warn(`Mustache render produced empty output`);
          else ok(`Mustache render OK — ${out.length} chars`);
        } catch (e) { err(`Mustache render failed: ${e.message}`); }
      } else {
        info(`Mustache not installed — skipping render trial`);
      }
      continue;
    }

    if (tier.tier === 'custom' || tier.tier === 'json-fallback') {
      if (ext === 'jsonl') {
        // JSONL: validate each line
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        let jsonlErr = 0;
        for (const [i, line] of lines.entries()) {
          try { JSON.parse(line); }
          catch (e) { err(`JSONL line ${i+1} invalid: ${e.message}`); jsonlErr++; if (jsonlErr >= 3) break; }
        }
        if (!jsonlErr) ok(`JSONL — ${lines.length} valid line(s)`);
      } else {
        try { JSON.parse(content); ok(`JSON valid`); }
        catch (e) { err(`JSON parse failed: ${e.message}`); }
      }
      continue;
    }

    if (tier.tier === 'format') {
      const fmt = tier.format || ext;
      if (fmt === 'md') {
        if (content.trim().length < 10) warn(`markdown content suspiciously short (${content.trim().length} chars)`);
        else ok(`markdown content OK`);
      } else if (fmt === 'jsonl') {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        let jsonlErr = 0;
        for (const [i, line] of lines.entries()) {
          try { JSON.parse(line); }
          catch (e) { err(`JSONL line ${i+1} invalid: ${e.message}`); jsonlErr++; if (jsonlErr >= 3) break; }
        }
        if (!jsonlErr) ok(`JSONL — ${lines.length} valid line(s)`);
      } else if (CODE_FORMATS.has(fmt)) {
        // source code / plain text — just check non-empty
        if (!content.trim()) err(`empty content`);
        else ok(`plain text (${fmt})`);
      }
      continue;
    }

    // unknown tier
    warn(`unknown tier "${tier.tier}" — no validation performed`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  if (errors === 0 && warnings === 0) {
    console.log(`All ${passed} check(s) passed.`);
  } else {
    if (errors)   console.error(`${errors} error(s)`);
    if (warnings) console.warn (`${warnings} warning(s)`);
    if (passed)   console.log  (`${passed} passed`);
  }

  if (viewer) viewer.kill();
  process.exit(errors > 0 ? 1 : 0);
})();

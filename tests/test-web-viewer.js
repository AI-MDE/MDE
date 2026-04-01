'use strict';

const http = require('http');
const { execSync, spawn } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:4000';
const APP_ROOT = 'c:/dev/leaveManagement';

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error(`timeout: ${url}`)));
  });
}

async function httpGetJson(url) {
  const response = await httpGet(url);
  return {
    statusCode: response.statusCode,
    json: JSON.parse(response.body),
    raw: response.body,
  };
}

function stopViewerListeners() {
  try {
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    output.split(/\r?\n/).forEach((line) => {
      if (!line.includes(':4000')) return;
      const parts = line.trim().split(/\s+/);
      const maybePid = parts[parts.length - 1];
      if (/^\d+$/.test(maybePid)) pids.add(maybePid);
    });
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        // Ignore failures; process may already be gone.
      }
    }
  } catch {
    // Ignore netstat/taskkill failures in test setup.
  }
}

async function waitForViewer(ms = 12000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await httpGet(`${BASE}/`);
      if (r.statusCode === 200) return;
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error('Viewer did not start within timeout');
}

function flattenDocs(tree) {
  const docs = [];
  for (const section of tree || []) {
    for (const doc of section.docs || []) {
      if (doc && typeof doc.file === 'string' && doc.file) docs.push(doc.file);
    }
    for (const group of section.groups || []) {
      for (const doc of group.docs || []) {
        if (doc && typeof doc.file === 'string' && doc.file) docs.push(doc.file);
      }
    }
  }
  return docs;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    console.error(`  ✗  ${name}`);
    console.error(`     ${msg}`);
    failed++;
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');

  stopViewerListeners();
  await sleep(500);

  const viewerProcess = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run viewer -- ${APP_ROOT} 4000`], {
      cwd: root,
      stdio: 'ignore',
    })
    : spawn('npm', ['run', 'viewer', '--', APP_ROOT, '4000'], {
      cwd: root,
      stdio: 'ignore',
    });

  try {
    await waitForViewer();

    let tree = [];

    await test('home page returns 200', async () => {
      const r = await httpGet(`${BASE}/`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
    });

    await test('style.css returns 200', async () => {
      const r = await httpGet(`${BASE}/style.css`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
    });

    await test('viewer-client.js returns 200 with JS content', async () => {
      const r = await httpGet(`${BASE}/viewer-client.js`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(r.body.includes('function init'), 'expected JS content');
    });

    await test('/api/config returns 200 with project metadata', async () => {
      const r = await httpGetJson(`${BASE}/api/config`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(typeof r.json === 'object' && r.json !== null, 'expected config object');
      assertTrue(typeof r.json.project === 'object', 'missing project object');
    });

    await test('/api/tree returns sections', async () => {
      const r = await httpGetJson(`${BASE}/api/tree`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(Array.isArray(r.json), 'expected array');
      assertTrue(r.json.length > 0, 'expected at least one section');
      tree = r.json;
    });

    await test('/api/manifest returns metadata', async () => {
      const r = await httpGetJson(`${BASE}/api/manifest`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(typeof r.json.title === 'string', 'missing manifest title');
      assertTrue(Array.isArray(r.json.sections), 'missing manifest sections');
    });

    await test('/api/ref-index returns JSON object', async () => {
      const r = await httpGetJson(`${BASE}/api/ref-index`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(typeof r.json === 'object' && r.json !== null, 'expected object');
    });

    await test('configuration.json loads via /api/doc', async () => {
      const r = await httpGetJson(`${BASE}/api/doc/configuration.json`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      assertTrue(r.json.ext === 'json', `expected ext=json, got ${r.json.ext}`);
      const cfg = JSON.parse(r.json.content);
      assertTrue(typeof cfg.project === 'object', 'configuration missing project');
    });

    await test('module-catalog.json loads via /api/doc', async () => {
      const r = await httpGetJson(`${BASE}/api/doc/design/modules/module-catalog.json`);
      assertTrue(r.statusCode === 200, `got ${r.statusCode}`);
      const data = JSON.parse(r.json.content);
      assertTrue(Array.isArray(data.catalog?.modules), 'missing catalog.modules');
      assertTrue(data.catalog.modules.length > 0, 'expected at least one module');
    });

    await test('at least one tree doc is readable via /api/doc', async () => {
      const docFiles = flattenDocs(tree);
      assertTrue(docFiles.length > 0, 'tree returned no docs');
      let loaded = 0;
      for (const file of docFiles) {
        const encoded = encodeURIComponent(file).replace(/%2F/g, '/');
        const r = await httpGet(`${BASE}/api/doc/${encoded}`);
        if (r.statusCode === 200) {
          loaded++;
          break;
        }
      }
      assertTrue(loaded > 0, 'no tree docs could be loaded');
    });

    await test('unknown doc path returns 404', async () => {
      const r = await httpGet(`${BASE}/api/doc/does/not/exist.md`);
      assertTrue(r.statusCode === 404, `got ${r.statusCode}`);
    });

    await test('path outside root returns 403/404', async () => {
      const r = await httpGet(`${BASE}/api/doc/../../etc/passwd`);
      assertTrue(r.statusCode === 403 || r.statusCode === 404, `got ${r.statusCode}`);
    });

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ${passed} passed  ${failed > 0 ? failed + ' failed' : ''}`);
    if (failed > 0) throw new Error(`${failed} test(s) failed`);

  } finally {
    if (!viewerProcess.killed) viewerProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

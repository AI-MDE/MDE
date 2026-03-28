/**
 * Viewer endpoint smoke tests.
 * Run while the server is up:
 *   node mde/web/test-viewer.js [--port=4000]
 */

const http = require('http');

const portArg = process.argv.find(a => a.startsWith('--port='));
const PORT    = portArg ? parseInt(portArg.slice('--port='.length), 10) : 4000;
const BASE    = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

// ── helpers ──────────────────────────────────────────────────────────────────

function get(urlPath, options = {}) {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}${urlPath}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (err) => resolve({ status: 0, body: err.message }));
    if (options.timeout) req.setTimeout(options.timeout, () => { req.destroy(); });
  });
}

function put(urlPath, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const opts = {
      hostname: 'localhost', port: PORT, path: urlPath, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (err) => resolve({ status: 0, body: err.message }));
    req.write(data);
    req.end();
  });
}

function assert(name, actual, expected, body) {
  const ok = Array.isArray(expected)
    ? expected.includes(actual)
    : actual === expected;
  if (ok) {
    console.log(`  ✓  ${name}`);
    passed++;
  } else {
    console.error(`  ✗  ${name}`);
    console.error(`     expected status ${JSON.stringify(expected)}, got ${actual}`);
    if (body && body.length < 400) console.error(`     body: ${body.trim()}`);
    failed++;
  }
}

function assertJson(name, body, check) {
  try {
    const obj = JSON.parse(body);
    if (check(obj)) {
      console.log(`  ✓  ${name}`);
      passed++;
    } else {
      console.error(`  ✗  ${name} — JSON check failed`);
      console.error(`     ${JSON.stringify(obj).slice(0, 200)}`);
      failed++;
    }
  } catch (e) {
    console.error(`  ✗  ${name} — invalid JSON: ${e.message}`);
    console.error(`     body: ${body.slice(0, 200)}`);
    failed++;
  }
}

// ── test suites ───────────────────────────────────────────────────────────────

async function testStatic() {
  console.log('\n── Static assets ──────────────────────────────────────────');

  const root = await get('/');
  assert('GET /  → 200', root.status, 200, root.body);
  if (root.status === 200) {
    const isHtml = root.headers['content-type']?.includes('text/html');
    assert('GET /  → text/html', isHtml, true);
  }

  const html = await get('/viewer.html');
  assert('GET /viewer.html → 200', html.status, 200, html.body);

  const css = await get('/style.css');
  assert('GET /style.css → 200', css.status, 200, css.body);

  const js = await get('/viewer-client.js');
  assert('GET /viewer-client.js → 200', js.status, 200, js.body);

  const missing = await get('/no-such-file.xyz');
  assert('GET /nonexistent → 404', missing.status, 404);
}

async function testApiManifest() {
  console.log('\n── /api/manifest ──────────────────────────────────────────');

  const r = await get('/api/manifest');
  assert('status 200', r.status, 200, r.body);
  if (r.status === 200) {
    assertJson('has title', r.body, d => typeof d.title === 'string');
    assertJson('has sections[]', r.body, d => Array.isArray(d.sections) && d.sections.length > 0);
    assertJson('has config field', r.body, d => typeof d.config === 'string');
  }
}

async function testApiConfig() {
  console.log('\n── /api/config ────────────────────────────────────────────');

  const r = await get('/api/config');
  assert('status 200', r.status, 200, r.body);
  if (r.status === 200) {
    assertJson('has ba section', r.body, d => d.ba && typeof d.ba.requirements === 'string');
    assertJson('has design section', r.body, d => d.design && typeof d.design.entities === 'string');
    assertJson('has project_state section', r.body, d => !!d.project_state);
  }
}

async function testApiTree() {
  console.log('\n── /api/tree ──────────────────────────────────────────────');

  const r = await get('/api/tree');
  assert('status 200', r.status, 200, r.body);
  if (r.status !== 200) return;

  let tree;
  try {
    tree = JSON.parse(r.body);
  } catch (e) {
    console.error(`  ✗  invalid JSON: ${e.message}`);
    failed++;
    return;
  }

  assert('returns array', Array.isArray(tree), true);
  assert('non-empty', tree.length > 0, true);

  console.log(`\n  Sections resolved (${tree.length}):`);
  for (const section of tree) {
    const docCount   = (section.docs   ?? []).length;
    const groupCount = (section.groups ?? []).length;
    const tag = docCount + groupCount > 0 ? '✓' : '⚠';
    console.log(`  ${tag}  [${section.id}]  ${section.label}  — ${docCount} docs, ${groupCount} groups`);

    for (const group of (section.groups ?? [])) {
      const gDocs   = (group.docs   ?? []).length;
      const gGroups = (group.groups ?? []).length;
      console.log(`       └─ ${group.label}  (${gDocs} docs, ${gGroups} sub-groups)`);
    }
  }

  // Check for un-resolved $config refs in file paths
  const allDocs = [];
  for (const section of tree) {
    for (const doc of section.docs ?? []) allDocs.push(doc);
    for (const group of section.groups ?? []) {
      for (const doc of group.docs ?? []) allDocs.push(doc);
      for (const sg of group.groups ?? []) {
        for (const doc of sg.docs ?? []) allDocs.push(doc);
      }
    }
  }
  const unresolved = allDocs.filter(d => d.file && d.file.includes('$config'));
  if (unresolved.length) {
    console.error(`\n  ✗  ${unresolved.length} doc(s) with unresolved $config refs:`);
    unresolved.forEach(d => console.error(`     ${d.id}: ${d.file}`));
    failed += unresolved.length;
  } else {
    console.log(`\n  ✓  all doc file paths resolved (no $config refs remaining)`);
    passed++;
  }
}

async function testApiDoc(tree) {
  console.log('\n── /api/doc/:path ─────────────────────────────────────────');

  // Collect a sample of leaf docs with concrete file paths
  const samples = [];
  try {
    const r = await get('/api/tree');
    const t = JSON.parse(r.body);
    for (const section of t) {
      for (const doc of section.docs ?? []) {
        if (doc.file && !doc.file.includes('$config')) samples.push(doc);
      }
      for (const group of section.groups ?? []) {
        for (const doc of group.docs ?? []) {
          if (doc.file && !doc.file.includes('$config') && samples.length < 5) samples.push(doc);
        }
      }
      if (samples.length >= 5) break;
    }
  } catch { /* skip if tree failed */ }

  if (!samples.length) {
    console.log('  ⚠  no docs to probe (tree empty or all unresolved)');
    return;
  }

  for (const doc of samples.slice(0, 5)) {
    const r = await get(`/api/doc/${encodeURIComponent(doc.file)}`);
    if (r.status === 200) {
      try {
        const obj = JSON.parse(r.body);
        if (obj.content !== undefined) {
          console.log(`  ✓  ${doc.id}  [${doc.file}]  (${obj.ext}, ${obj.content.length} chars)`);
          passed++;
        } else {
          console.error(`  ✗  ${doc.id}  — response has no .content`);
          failed++;
        }
      } catch {
        console.error(`  ✗  ${doc.id}  — non-JSON response`);
        failed++;
      }
    } else {
      console.error(`  ✗  ${doc.id}  [${doc.file}]  → ${r.status}`);
      if (r.body.length < 200) console.error(`     ${r.body.trim()}`);
      failed++;
    }
  }

  // Security: path traversal must be denied
  const traversal = await get('/api/doc/..%2F..%2Fetc%2Fpasswd');
  assert('path traversal → 403 or 404', traversal.status, [403, 404]);
}

async function testBadRoutes() {
  console.log('\n── Error handling ─────────────────────────────────────────');

  const r404 = await get('/api/does-not-exist');
  assert('unknown /api/* → 404', r404.status, 404);
}

// ── run ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nViewer smoke tests  →  ${BASE}`);

  // Quick connectivity check
  const ping = await get('/api/manifest', { timeout: 3000 });
  if (ping.status === 0) {
    console.error(`\n  Cannot reach ${BASE} — is the server running?\n`);
    console.error(`  Start it with:`);
    console.error(`    ts-node mde/web/viewer.ts --root=C:/dev/leaveManagement\n`);
    process.exit(1);
  }

  await testStatic();
  await testApiManifest();
  await testApiConfig();
  await testApiTree();
  await testApiDoc();
  await testBadRoutes();

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  passed: ${passed}   failed: ${failed}`);
  console.log(`${'─'.repeat(55)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();

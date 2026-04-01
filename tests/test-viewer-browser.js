'use strict';

/**
 * Browser tests for the MDE viewer using Playwright.
 * Tests page behaviour: navigation, history, menus, rendering, relative links.
 *
 * Usage:
 *   node tests/test-viewer-browser.js
 *
 * Requires the viewer to already be running on http://localhost:4000
 * OR will start it automatically if not running.
 */

const http     = require('http');
const path     = require('path');
const { execSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const BASE    = 'http://localhost:4000';
const ROOT    = path.resolve(__dirname, '..');
const APP_ROOT = 'c:/dev/leaveManagement';
let passed = 0;
let failed = 0;
let viewerProcess = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

/**
 * Creates a new page and collects any JS errors (pageerror + console errors)
 * into the provided array.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string[]} [errors] - Optional array to collect error messages.
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function newPage(context, errors) {
  const page = await context.newPage();
  if (errors) {
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  }
  return page;
}

function isViewerRunning() {
  return new Promise(resolve => {
    http.get(`${BASE}/`, res => { res.resume(); resolve(true); }).on('error', () => resolve(false));
  });
}

function stopExisting() {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    out.split(/\r?\n/).forEach(line => {
      if (!line.includes(':4000')) return;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    });
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch {}
    }
  } catch {}
}

async function waitForViewer(ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await isViewerRunning()) return;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Viewer did not start within timeout');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Always start a fresh server so tests never run against a stale instance.
  stopExisting();
  await new Promise(r => setTimeout(r, 300));
  viewerProcess = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run viewer -- ${APP_ROOT} 4000`], {
      cwd: ROOT,
      stdio: 'ignore',
    })
    : spawn('npm', ['run', 'viewer', '--', APP_ROOT, '4000'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  await waitForViewer();

  const browser = await chromium.launch({ headless: true });
  // Use domcontentloaded so tests don't hang waiting for deferred CDN scripts (e.g. Mermaid)
  const context = await browser.newContext();
  context.setDefaultNavigationTimeout(15000);
  const GOTO = { waitUntil: 'domcontentloaded' };

  try {
    console.log('\n── Page load ────────────────────────────────────────────');

    await test('home page loads and shows viewer UI', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('#sidebar', { timeout: 5000 });
      await page.close();
    });

    await test('sidebar contains at least one phase section', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.phase-section', { timeout: 5000 });
      const count = await page.locator('.phase-section').count();
      assertTrue(count > 0, `expected phase sections, got ${count}`);
      await page.close();
    });

    await test('welcome message shown before any doc selected', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('#welcome', { timeout: 5000 });
      const visible = await page.locator('#welcome').isVisible();
      assertTrue(visible, 'welcome panel should be visible on fresh load');
      await page.close();
    });

    console.log('\n── Document navigation ──────────────────────────────────');

    await test('clicking a sidebar doc renders content', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      await page.locator('.nav-item').first().click();
      await page.waitForSelector('#doc-body :is(p, table, h1, h2, pre)', { timeout: 5000 });
      await page.close();
    });

    await test('clicking a doc updates the URL hash', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      await page.locator('.nav-item').first().click();
      await page.waitForFunction(() => location.hash.startsWith('#doc='), { timeout: 3000 });
      const hash = await page.evaluate(() => location.hash);
      assertTrue(hash.startsWith('#doc='), `expected #doc= hash, got: ${hash}`);
      await page.close();
    });

    await test('browser back button returns to previous doc', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const items = page.locator('.nav-item');
      await items.nth(0).click();
      await page.waitForFunction(() => location.hash.startsWith('#doc='), { timeout: 3000 });
      const hash1 = await page.evaluate(() => location.hash);
      await items.nth(1).click();
      await page.waitForFunction(h => location.hash !== h, hash1, { timeout: 3000 });
      await page.goBack();
      await page.waitForFunction(h => location.hash === h, hash1, { timeout: 3000 });
      const hashAfterBack = await page.evaluate(() => location.hash);
      assertTrue(hashAfterBack === hash1, `expected ${hash1}, got ${hashAfterBack}`);
      await page.close();
    });

    await test('direct URL with #doc= hash restores doc on load', async () => {
      // First get a valid doc hash
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      await page.locator('.nav-item').first().click();
      await page.waitForFunction(() => location.hash.startsWith('#doc='), { timeout: 3000 });
      const hash = await page.evaluate(() => location.hash);
      // Navigate directly to that hash
      await page.goto(`${BASE}/${hash}`, GOTO);
      await page.waitForSelector('#doc-body :is(p, table, h1, h2, pre)', { timeout: 6000 });
      const welcome = await page.locator('#welcome').isVisible();
      assertTrue(!welcome, 'welcome panel should be hidden when doc loaded from hash');
      await page.close();
    });

    console.log('\n── Hamburger menu ───────────────────────────────────────');

    await test('hamburger menu opens on click', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('#menu-btn', { timeout: 5000 });
      await page.locator('#menu-btn').click();
      const open = await page.locator('#menu-dropdown').evaluate(el => el.classList.contains('open'));
      assertTrue(open, 'menu-dropdown should have class "open" after click');
      await page.close();
    });

    await test('menu closes when clicking outside', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.locator('#menu-btn').click();
      await page.locator('#breadcrumb').click();
      await page.waitForFunction(() => !document.getElementById('menu-dropdown').classList.contains('open'), { timeout: 2000 });
      const open = await page.locator('#menu-dropdown').evaluate(el => el.classList.contains('open'));
      assertTrue(!open, 'menu should close when clicking outside');
      await page.close();
    });

    await test('Methodology menu item loads lifecycle.md', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.locator('#menu-btn').click();
      await page.locator('button.menu-item', { hasText: 'Methodology' }).click();
      await page.waitForSelector('#doc-body :is(h1, h2)', { timeout: 5000 });
      const heading = await page.locator('#doc-body h1').first().textContent();
      assertTrue(heading.includes('Lifecycle') || heading.includes('MDE'), `unexpected heading: ${heading}`);
      await page.close();
    });

    await test('AI Instructions menu item loads index.md', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.locator('#menu-btn').click();
      await page.locator('button.menu-item', { hasText: 'AI Instructions' }).click();
      await page.waitForSelector('#doc-body :is(h1, h2)', { timeout: 5000 });
      const heading = await page.locator('#doc-body h1').first().textContent();
      assertTrue(heading.toLowerCase().includes('ai') || heading.toLowerCase().includes('instruction'), `unexpected heading: ${heading}`);
      await page.close();
    });

    console.log('\n── Relative link navigation ─────────────────────────────');

    await test('commands/ link in AI Instructions index navigates to commands index', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.locator('#menu-btn').click();
      await page.locator('button.menu-item', { hasText: 'AI Instructions' }).click();
      await page.waitForSelector('#doc-body a', { timeout: 5000 });
      const commandsLink = page.locator('#doc-body a', { hasText: /commands/i }).first();
      const count = await commandsLink.count();
      if (count === 0) { console.log('     (no commands link found — skipping)'); return; }
      await commandsLink.click();
      await page.waitForSelector('#doc-body :is(h1, table)', { timeout: 5000 });
      const body = await page.locator('#doc-body').textContent();
      assertTrue(body.toLowerCase().includes('command'), `expected commands content, got: ${body.slice(0, 100)}`);
      await page.close();
    });

    console.log('\n── Rendering ────────────────────────────────────────────');

    await test('mermaid diagrams container present in lifecycle.md', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.locator('#menu-btn').click();
      await page.locator('button.menu-item', { hasText: 'Methodology' }).click();
      await page.waitForSelector('#doc-body', { timeout: 5000 });
      // mermaid blocks become either <pre class="mermaid"> or <svg>
      const hasDiagram = await page.locator('#doc-body .mermaid, #doc-body svg').count();
      assertTrue(hasDiagram > 0, 'expected at least one mermaid or svg element in lifecycle.md');
      await page.close();
    });

    console.log('\n── Module catalog rendering ─────────────────────────────');

    // Expand the phase section containing a nav item so it becomes clickable
    async function expandNavItemPhase(page, label) {
      await page.evaluate(text => {
        const item = [...document.querySelectorAll('.nav-item')]
          .find(el => el.textContent.toLowerCase().includes(text.toLowerCase()));
        if (!item) return;
        const phase = item.closest('.phase-section');
        if (phase && !phase.classList.contains('open')) {
          phase.querySelector('.phase-toggle')?.click();
        }
      }, label);
    }

    await test('module catalog nav item exists in sidebar', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const item = page.locator('.nav-item', { hasText: /module catalog/i });
      const count = await item.count();
      assertTrue(count > 0, 'expected a "Module Catalog" nav item in the sidebar');
      await page.close();
    });

    await test('module catalog renders table with module rows', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const item = page.locator('.nav-item', { hasText: /module catalog/i });
      if (await item.count() === 0) { console.log('     (no Module Catalog nav item — skipping)'); return; }
      await expandNavItemPhase(page, 'module catalog');
      await item.first().click();
      await page.waitForSelector('#doc-body table', { timeout: 5000 });
      const rows = await page.locator('#doc-body table tbody tr').count();
      assertTrue(rows > 0, `expected module rows, got ${rows}`);
      await page.close();
    });

    await test('module catalog rows show id and name (no "undefined")', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const item = page.locator('.nav-item', { hasText: /module catalog/i });
      if (await item.count() === 0) { console.log('     (no Module Catalog nav item — skipping)'); return; }
      await expandNavItemPhase(page, 'module catalog');
      await item.first().click();
      await page.waitForSelector('#doc-body table tbody tr', { timeout: 5000 });
      const firstRow = await page.locator('#doc-body table tbody tr').first().textContent();
      assertTrue(!firstRow.includes('undefined'), `row contains "undefined": ${firstRow}`);
      await page.close();
    });

    await test('clicking a module row opens the popover', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const item = page.locator('.nav-item', { hasText: /module catalog/i });
      if (await item.count() === 0) { console.log('     (no Module Catalog nav item — skipping)'); return; }
      await expandNavItemPhase(page, 'module catalog');
      await item.first().click();
      await page.waitForSelector('#doc-body table tbody tr', { timeout: 5000 });
      await page.locator('#doc-body table tbody tr').first().click();
      await page.waitForFunction(() => {
        const pop = document.getElementById('mod-popover');
        return pop && pop.style.display !== 'none' && pop.style.display !== '';
      }, { timeout: 3000 });
      const popVisible = await page.locator('#mod-popover').evaluate(el => el.style.display !== 'none');
      assertTrue(popVisible, 'module popover should appear after clicking a row');
      await page.close();
    });

    console.log('\n── Command log rendering ────────────────────────────────');

    await test('command log nav item exists in sidebar', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const logItem = page.locator('.nav-item', { hasText: /command log/i });
      const count = await logItem.count();
      assertTrue(count > 0, 'expected a "Command Log" nav item in the sidebar');
      await page.close();
    });

    await test('command log renders a table with headers', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const logItem = page.locator('.nav-item', { hasText: /command log/i });
      if (await logItem.count() === 0) { console.log('     (no Command Log nav item — skipping)'); return; }
      await logItem.first().click();
      await page.waitForSelector('#doc-body h1', { timeout: 5000 });
      const heading = await page.locator('#doc-body h1').first().textContent();
      assertTrue(heading.toLowerCase().includes('command'), `unexpected heading: ${heading}`);
      // Should render either a table or "No entries yet"
      const hasTable = await page.locator('#doc-body table').count();
      const hasEmpty = await page.locator('#doc-body').textContent();
      assertTrue(hasTable > 0 || hasEmpty.includes('No entries'), 'expected table or empty message');
      await page.close();
    });

    await test('command log table has expected column headers', async () => {
      const page = await newPage(context);
      await page.goto(BASE, GOTO);
      await page.waitForSelector('.nav-item', { timeout: 5000 });
      const logItem = page.locator('.nav-item', { hasText: /command log/i });
      if (await logItem.count() === 0) { console.log('     (no Command Log nav item — skipping)'); return; }
      await logItem.first().click();
      await page.waitForSelector('#doc-body h1', { timeout: 5000 });
      const tableExists = await page.locator('#doc-body table').count();
      if (!tableExists) { console.log('     (no entries in log — skipping column check)'); return; }
      const headers = await page.locator('#doc-body table th').allTextContents();
      const headerText = headers.join(' ').toLowerCase();
      assertTrue(headerText.includes('command'), `missing "Command" header, got: ${headers.join(', ')}`);
      assertTrue(headerText.includes('status'), `missing "Status" header, got: ${headers.join(', ')}`);
      assertTrue(headerText.includes('time'), `missing "Time" header, got: ${headers.join(', ')}`);
      await page.close();
    });

  } finally {
    await browser.close();
    if (viewerProcess && !viewerProcess.killed) viewerProcess.kill('SIGTERM');
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed  ${failed > 0 ? failed + ' failed' : ''}`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

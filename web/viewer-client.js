/** @fileoverview Browser client for the MDE Design Document Viewer. */

// ── State ──────────────────────────────────────────────────────────────────────
let tree = [];
let catalog = {};   // docType id → document-catalog entry, loaded from /api/catalog
let activeId = null;
let activeDoc = null;   // current doc descriptor
let activeContent = ''; // raw content of current doc
let editing = false;
let activeRenderedFrom = null;
let activeRawOverride = false;
let commandMeta = {};
let allCommands = [];
let aiAvailable = false;
let commandBindings = {};
let refreshCommandList = () => {};

window.addEventListener('load', () => {
  if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
});


// ── Menu ───────────────────────────────────────────────────────────────────────

/**
 * Toggles the top-bar navigation menu open/closed.
 */
function toggleMenu() {
  const btn = document.getElementById('menu-btn');
  const dd  = document.getElementById('menu-dropdown');
  const open = dd.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('menu-wrap');
  if (wrap && !wrap.contains(e.target)) closeMenu();
});

/**
 * Closes the navigation menu and resets its ARIA state.
 */
function closeMenu() {
  document.getElementById('menu-dropdown').classList.remove('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
}

/**
 * Opens the Project State document via the menu.
 */
function openProject() {
  closeMenu();
  const doc = { id: 'project-state', label: 'Project', file: 'project/project-state.json', docType: 'project-state' };
  _adHocDocs[doc.id] = doc;
  loadDoc(doc);
}

/**
 * Opens the Methodology lifecycle document via the menu.
 */
function openMethodology() {
  closeMenu();
  const doc = { id: 'methodology-lifecycle', label: 'Methodology', file: 'mde/docs/lifecycle.md', docType: 'file' };
  _adHocDocs[doc.id] = doc;
  loadDoc(doc);
}

/**
 * Opens the AI Instructions index document via the menu.
 */
function openAIInstructions() {
  closeMenu();
  const doc = { id: 'ai-instructions-index', label: 'AI Instructions', file: 'mde/docs/ai-instructions/index.md', docType: 'file' };
  _adHocDocs[doc.id] = doc;
  loadDoc(doc);
}


// ── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Emits a structured log message to the browser console.
 * @param {'error'|'warn'|'log'} level - Log severity.
 * @param {string} message - Human-readable message.
 * @param {Object} [details] - Optional structured detail object.
 */
function clientLog(level, message, details) {
  const payload = details ? { message, ...details } : { message };
  if (level === 'error') console.error('[viewer-client]', payload);
  else if (level === 'warn') console.warn('[viewer-client]', payload);
  else console.log('[viewer-client]', payload);
}

/**
 * Strips a UTF-8 BOM character from the start of a string.
 * @param {string} value - The string to strip.
 * @returns {string} The string without a leading BOM.
 */
function stripBom(value) {
  return typeof value === 'string' ? value.replace(/^\uFEFF/, '') : value;
}

/**
 * Parses a JSON string, stripping a BOM if present, and throws a descriptive
 * error on failure.
 * @param {string} value - Raw JSON string.
 * @param {string} [context='JSON'] - Label used in the error message.
 * @returns {*} Parsed value.
 * @throws {Error} If JSON parsing fails.
 */
function parseJsonSafe(value, context = 'JSON') {
  try {
    return JSON.parse(stripBom(value));
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    throw new Error(`${context} parse failed: ${detail}`);
  }
}

/**
 * Escapes special HTML characters in a string.
 * @param {string} str - The input string.
 * @returns {string} HTML-safe string.
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ── Entity Cross-Reference ─────────────────────────────────────────────────────
const entityCache = {};
let popoverHideTimer = null;

/**
 * Finds a document descriptor by its ID by searching the full tree.
 * @param {string} id - The document ID.
 * @returns {{id:string, label:string, file:string, docType:string}|null} The doc descriptor, or null.
 */
function groupDocs(g) {
  const docs = [...(g.docs || [])];
  for (const sub of (g.groups || [])) docs.push(...groupDocs(sub));
  return docs;
}

function findDocById(id) {
  for (const phase of tree) {
    for (const doc of (phase.docs || []))
      if (doc.id === id) return doc;
    for (const g of (phase.groups || []))
      for (const doc of groupDocs(g))
        if (doc.id === id) return doc;
  }
  return null;
}

/**
 * Navigates to the document identified by the given ID.
 * @param {string} entityId - The document ID to navigate to.
 */
function navigateTo(entityId) {
  const doc = findDocById(entityId);
  if (doc) loadDoc(doc);
}

/**
 * Converts an entity ID slug (e.g. "ent-employee-record") into a display name.
 * @param {string} entId - The entity ID slug.
 * @returns {string} Human-readable entity name.
 */
function entityNameFromId(entId) {
  if (!entId) return '';
  return String(entId).replace(/^ent-/, '')
              .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
              .replace(/^[a-z]/, c => c.toUpperCase());
}

/**
 * Builds an HTML string for an interactive entity cross-reference chip.
 * Hovering shows the entity popover; clicking navigates to the entity.
 * @param {string} entId - The entity ID slug.
 * @returns {string} HTML string for the entity ref chip.
 */
function entRefHtml(entId) {
  const name = entityNameFromId(entId);
  return `<span class="entity-ref"
    onmouseenter="showEntityPopover('${entId}', this)"
    onmouseleave="scheduleHidePopover()"
    onclick="navigateTo('${entId}')">${escHtml(name)}</span>`;
}

/**
 * Fetches JSON from a URL with a 15-second timeout.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} [options] - Optional fetch options.
 * @returns {Promise<any>} Parsed JSON response.
 * @throws {Error} On network failure, timeout, or non-OK HTTP status.
 */
async function fetchJson(url, options) {
  const timeoutMs = 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const mergedOptions = { ...(options || {}), signal: controller.signal };
  let res;
  try {
    res = await fetch(url, mergedOptions);
  } catch (err) {
    clientLog('error', 'HTTP fetch failed', {
      url,
      method: (mergedOptions.method || 'GET').toUpperCase(),
      reason: err && err.message ? err.message : String(err),
    });
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw new Error(`Failed to fetch ${url}: ${err && err.message ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    const suffix = text ? `: ${text}` : '';
    throw new Error(`${res.status} ${res.statusText}${suffix}`);
  }
  if (!text) return {};
  try {
    return parseJsonSafe(text, 'HTTP response');
  } catch (err) {
    throw new Error(`Invalid JSON response: ${err.message}`);
  }
}

/**
 * Fetches entity data and shows a hover popover anchored to the given element.
 * @param {string} entId - The entity document ID.
 * @param {HTMLElement} anchorEl - The element the popover should appear near.
 */
async function showEntityPopover(entId, anchorEl) {
  cancelHidePopover();
  if (!entityCache[entId]) {
    try {
      const docEntry = findDocById(entId);
      if (!docEntry?.file) return;
      const { content } = await fetchJson(`/api/doc/${encodeURIComponent(docEntry.file)}`);
      entityCache[entId] = parseJsonSafe(content, `entity document (${entId})`);
    } catch { return; }
  }
  const d = entityCache[entId];
  const catClass = (d.category || '').replace(/\s+/g, '-');

  document.getElementById('pop-name').textContent = d.entityName;
  const MANAGED_LABELS_POP = { system: 'System', ui: 'UI', external: 'External' };
  const SOURCE_LABELS_POP  = { external: 'External', seed: 'Seed', 'user-generated': 'User Generated', 'data-conversion': 'Data Conversion' };
  const mLabel = d.managedBy ? (MANAGED_LABELS_POP[d.managedBy] || d.managedBy) : '';
  const sLabel = d.source    ? (SOURCE_LABELS_POP[d.source]     || d.source)     : '';
  document.getElementById('pop-meta').innerHTML =
    `<span class="cat-badge ${catClass}">${escHtml(d.category)}</span>
     ${mLabel ? `<span class="managed-badge ${escHtml(d.managedBy)}">${escHtml(mLabel)}</span>` : ''}
     ${sLabel ? `<span class="source-badge ${escHtml(d.source)}">${escHtml(sLabel)}</span>` : ''}
     <span style="font-size:11.5px;color:var(--muted)">owned by ${escHtml(d.owningModule)}</span>`;
  document.getElementById('pop-desc').textContent = d.description || '';

  const stateCount = d.stateMachine?.states?.length || 0;
  const fieldCount = d.fields?.length || 0;
  const eventCount = d.events?.published?.length || 0;
  const relCount   = d.relationships?.length || 0;
  document.getElementById('pop-stats').innerHTML =
    `<div class="pop-stat"><span class="val">${fieldCount}</span>fields</div>
     ${stateCount ? `<div class="pop-stat"><span class="val">${stateCount}</span>states</div>` : ''}
     ${eventCount ? `<div class="pop-stat"><span class="val">${eventCount}</span>events</div>` : ''}
     ${relCount   ? `<div class="pop-stat"><span class="val">${relCount}</span>relations</div>` : ''}`;

  document.getElementById('pop-goto').textContent = `-> Open ${d.entityName}`;
  document.getElementById('pop-goto').onclick = () => { hideEntityPopover(); navigateTo(entId); };
  positionAndShowPopover(anchorEl);
}

/**
 * Schedules the entity popover to be hidden after a short delay.
 */
function scheduleHidePopover() {
  popoverHideTimer = setTimeout(hideEntityPopover, 150);
}

/**
 * Cancels a pending popover hide, keeping the popover visible.
 */
function cancelHidePopover() {
  if (popoverHideTimer) { clearTimeout(popoverHideTimer); popoverHideTimer = null; }
}

/**
 * Immediately hides the entity popover.
 */
function hideEntityPopover() {
  document.getElementById('entity-popover').classList.remove('visible');
}

/**
 * Positions the shared popover element relative to an anchor and makes it visible.
 * @param {HTMLElement} anchorEl - The element to anchor the popover to.
 */
function positionAndShowPopover(anchorEl) {
  const pop  = document.getElementById('entity-popover');
  const rect = anchorEl.getBoundingClientRect();
  const popW = 320, popH = 210;
  let top  = rect.bottom + 8;
  let left = rect.left;
  if (top  + popH > window.innerHeight - 16) top  = rect.top  - popH - 8;
  if (left + popW > window.innerWidth  - 16) left = window.innerWidth - popW - 16;
  pop.style.top  = top  + 'px';
  pop.style.left = left + 'px';
  pop.classList.add('visible');
}


// ── Module Cross-Reference ─────────────────────────────────────────────────────
const _moduleCache = {};

/**
 * Builds an HTML string for an interactive module cross-reference chip.
 * @param {string} modId - The module ID (e.g. "MOD-02").
 * @returns {string} HTML string for the module ref chip.
 */
function modRefHtml(modId) {
  if (!modId) return '';
  const doc = _modById[modId];
  if (!doc) return `<code>${escHtml(modId)}</code>`;
  return `<span class="module-ref"
    onmouseenter="showModulePopover('${modId}', this)"
    onmouseleave="scheduleHidePopover()"
    onclick="navigateTo('${doc.id}')">${escHtml(modId)}</span>`;
}

/**
 * Fetches module data and shows a hover popover anchored to the given element.
 * @param {string} modId - The module ID (e.g. "MOD-02").
 * @param {HTMLElement} anchorEl - The element to anchor the popover to.
 */
async function showModulePopover(modId, anchorEl) {
  cancelHidePopover();
  if (!_moduleCache[modId]) {
    const doc = _modById[modId];
    if (!doc || !doc.file) return;
    try {
      const { content } = await fetchJson(`/api/doc/${encodeURIComponent(doc.file)}`);
      _moduleCache[modId] = parseJsonSafe(content, `module document (${modId})`);
    } catch { return; }
  }
  const d = _moduleCache[modId];
  document.getElementById('pop-name').textContent = d.moduleName || d.moduleId;
  document.getElementById('pop-meta').innerHTML =
    `<span style="padding:3px 9px;border-radius:20px;font-size:12px;font-weight:600;background:#f0fdf4;color:#166534">${escHtml(d.moduleId)}</span>
     <span style="font-size:11.5px;color:var(--muted)">v${escHtml(d.version || '1.0')}</span>`;
  document.getElementById('pop-desc').textContent = (d.implements || []).length
    ? 'Implements: ' + d.implements.join(', ') : '';
  const epC = d.api?.endpoints?.length || 0;
  const pbC = d.events?.published?.length || 0;
  const cnC = d.events?.consumed?.length  || 0;
  const imC = (d.implements || []).length;
  document.getElementById('pop-stats').innerHTML =
    `${epC ? `<div class="pop-stat"><span class="val">${epC}</span>endpoints</div>` : ''}
     ${pbC ? `<div class="pop-stat"><span class="val">${pbC}</span>published</div>` : ''}
     ${cnC ? `<div class="pop-stat"><span class="val">${cnC}</span>consumed</div>`  : ''}
     ${imC ? `<div class="pop-stat"><span class="val">${imC}</span>entities</div>`  : ''}`;
  document.getElementById('pop-goto').textContent = `-> Open ${d.moduleId}`;
  document.getElementById('pop-goto').onclick = () => { hideEntityPopover(); navigateTo(_modById[modId].id); };
  positionAndShowPopover(anchorEl);
}


// ── Use-Case Cross-Reference ───────────────────────────────────────────────────
const _ucCache = {};

/**
 * Builds an HTML string for an interactive use-case cross-reference chip.
 * @param {string} ucId - The use-case ID (e.g. "UC-03").
 * @returns {string} HTML string for the use-case ref chip.
 */
function ucRefHtml(ucId) {
  if (!ucId) return '';
  const doc = _ucById[ucId];
  if (!doc) return `<code>${escHtml(ucId)}</code>`;
  return `<span class="usecase-ref"
    onmouseenter="showUCPopover('${ucId}', this)"
    onmouseleave="scheduleHidePopover()"
    onclick="navigateTo('${doc.id}')">${escHtml(ucId)}</span>`;
}

/**
 * Fetches use-case data and shows a hover popover anchored to the given element.
 * @param {string} ucId - The use-case ID (e.g. "UC-03").
 * @param {HTMLElement} anchorEl - The element to anchor the popover to.
 */
async function showUCPopover(ucId, anchorEl) {
  cancelHidePopover();
  if (!_ucCache[ucId]) {
    const doc = _ucById[ucId];
    if (!doc || !doc.file) return;
    try {
      const { content } = await fetchJson(`/api/doc/${encodeURIComponent(doc.file)}`);
      const lines = content.split('\n');
      const title = (lines.find(l => l.startsWith('# ')) || '').replace(/^# /, '').trim() || doc.label;
      const desc  = lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-')) || '';
      _ucCache[ucId] = { id: doc.id, label: doc.label, title, desc, words: content.split(/\s+/).length };
    } catch { return; }
  }
  const d = _ucCache[ucId];
  document.getElementById('pop-name').textContent = d.title;
  document.getElementById('pop-meta').innerHTML =
    `<span style="padding:3px 9px;border-radius:20px;font-size:12px;font-weight:600;background:#fffbeb;color:#92400e">${escHtml(ucId)}</span>`;
  document.getElementById('pop-desc').textContent = d.desc;
  document.getElementById('pop-stats').innerHTML =
    `<div class="pop-stat"><span class="val">${d.words}</span>words</div>`;
  document.getElementById('pop-goto').textContent = `-> Open ${ucId}`;
  document.getElementById('pop-goto').onclick = () => { hideEntityPopover(); navigateTo(d.id); };
  positionAndShowPopover(anchorEl);
}


// ── Doc Lookup Maps ────────────────────────────────────────────────────────────
let _modById = {};  // "MOD-02" -> doc entry from tree
let _ucById  = {};  // "UC-03"  -> doc entry from tree

/**
 * Builds fast-lookup maps from module/use-case IDs to their doc tree entries.
 * @param {Array} phases - The document tree phases from the API.
 */
function buildDocLookups(phases) {
  _modById = {}; _ucById = {};
  phases.forEach(phase => {
    [...(phase.docs || []), ...(phase.groups || []).flatMap(g => groupDocs(g))].forEach(doc => {
      const modM = doc.id.match(/^mod-(\d+)/);
      if (modM) _modById['MOD-' + modM[1]] = doc;
      const ucM = doc.id.match(/^uc-(\d+)/);
      if (ucM) _ucById['UC-' + ucM[1]] = doc;
    });
  });
}


// ── Sidebar Builder ────────────────────────────────────────────────────────────

/**
 * Reads the document ID from the current URL hash (e.g. `#doc=uc-01`).
 * @returns {string|null} The decoded document ID, or null.
 */
function docFromHash() {
  const m = location.hash.match(/^#doc=(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Initializes the viewer: fetches the doc tree, builds the nav, initialises
 * commands, and restores the document from the URL hash if present.
 */
async function init() {
  try {
    const [treeData, catalogData] = await Promise.all([
      fetchJson('/api/tree'),
      fetchJson('/api/catalog').catch(() => ({ document_types: [] })),
    ]);
    tree = treeData;
    catalog = {};
    for (const dt of (catalogData.document_types || [])) {
      catalog[dt.id] = dt;
    }
    buildDocLookups(tree);
    buildNav(tree);
    await initCommands();
    // auto-open first phase
    document.querySelector('.phase-section')?.classList.add('open');
    document.getElementById('loading').style.display = 'none';

    // restore doc from URL hash (direct link / page refresh)
    const hashId = docFromHash();
    if (hashId) {
      const doc = findDocById(hashId) || docFromId(hashId);
      if (doc) loadDoc(doc, { pushHistory: false });
    }
  } catch (err) {
    console.error('Viewer init failed:', err);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('doc-body').innerHTML = `<p style="color:red">Viewer failed to initialize: ${err.message}</p>`;
  }
}

// Reconstruct a minimal doc object from a stored id when it isn't in the tree
// (e.g. docs opened via menu or relative link clicks)
const _adHocDocs = {};

/**
 * Retrieves an ad-hoc (non-tree) document descriptor by its ID.
 * @param {string} id - The document ID.
 * @returns {{id:string, label:string, file:string, docType:string}|null}
 */
function docFromId(id) {
  return _adHocDocs[id] || null;
}

// back/forward navigation
window.addEventListener('popstate', e => {
  const id = e.state?.docId || docFromHash();
  if (!id) return;
  const doc = findDocById(id) || docFromId(id);
  if (doc) loadDoc(doc, { pushHistory: false });
});

/**
 * Renders the sidebar navigation from the document tree phases.
 * @param {Array} phases - The document tree phases from the API.
 */
function buildNav(phases) {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  phases.forEach(phase => {
    const section = document.createElement('div');
    section.className = 'phase-section';
    section.dataset.phaseId = phase.id;

    const toggle = document.createElement('div');
    toggle.className = 'phase-toggle';
    toggle.innerHTML = `<span class="arrow"></span>${phase.label}`;
    toggle.onclick = () => section.classList.toggle('open');
    section.appendChild(toggle);

    const docsDiv = document.createElement('div');
    docsDiv.className = 'phase-docs';

    (phase.docs || []).forEach(doc => docsDiv.appendChild(navItem(doc)));

    const BASE_PAD = 22; // matches .nav-group-label and .nav-item default padding-left
    function appendGroup(container, group, depth) {
      const lbl = document.createElement('div');
      lbl.className = 'nav-group-label';
      lbl.style.paddingLeft = (BASE_PAD + depth * 12) + 'px';
      lbl.textContent = group.label;
      container.appendChild(lbl);
      (group.docs || []).forEach(doc => {
        const item = navItem(doc);
        item.style.paddingLeft = (BASE_PAD + (depth + 1) * 12) + 'px';
        container.appendChild(item);
      });
      (group.groups || []).forEach(sub => appendGroup(container, sub, depth + 1));
    }
    (phase.groups || []).forEach(group => appendGroup(docsDiv, group, 0));

    section.appendChild(docsDiv);
    nav.appendChild(section);
  });
}

/**
 * Initialises the command bar: fetches available commands, sets up the select
 * list, wires up Run / Copy Prompt / Run with AI buttons.
 */
async function initCommands() {
  const status = document.getElementById('cmd-status');
  const select = document.getElementById('cmd-select');
  const runBtn = document.getElementById('cmd-run');
  const opts = document.getElementById('cmd-options');

  const renderCommandOptions = (commands, preferredNames = []) => {
    const preferred = [];
    const remaining = [];
    const preferredSet = new Set(preferredNames);
    commands.forEach(cmd => {
      if (preferredSet.has(cmd.name)) preferred.push(cmd);
      else remaining.push(cmd);
    });
    select.innerHTML = '';
    const appendOption = (cmd, suffix = '') => {
      const opt = document.createElement('option');
      opt.value = cmd.name;
      opt.textContent = `${cmd.label} (${cmd.name})${suffix}`;
      select.appendChild(opt);
    };
    preferred.forEach(cmd => appendOption(cmd, ' [recommended]'));
    if (preferred.length && remaining.length) {
      const divider = document.createElement('option');
      divider.disabled = true;
      divider.textContent = '----------------';
      select.appendChild(divider);
    }
    remaining.forEach(cmd => appendOption(cmd));
  };

  const getRelevantCommandNames = () => {
    const ordered = [];
    const seen = new Set();
    const pushNames = names => {
      (names || []).forEach(name => {
        if (!seen.has(name) && commandMeta[name]) {
          seen.add(name);
          ordered.push(name);
        }
      });
    };
    pushNames(commandBindings.default);
    if (activeDoc) {
      const phase = findPhase(activeDoc.id);
      pushNames(commandBindings.phases?.[phase?.id]);
      pushNames(commandBindings.docTypes?.[activeDoc.docType]);
      pushNames(commandBindings.docIds?.[activeDoc.id]);
    }
    return ordered;
  };

  refreshCommandList = () => {
    const preferredNames = getRelevantCommandNames();
    renderCommandOptions(allCommands, preferredNames);
    if (!select.value || select.selectedOptions[0]?.disabled) {
      const firstEnabled = [...select.options].find(opt => !opt.disabled);
      if (firstEnabled) select.value = firstEnabled.value;
    }
    if (preferredNames.length && activeDoc) {
      status.textContent = `Recommended commands for ${activeDoc.label}`;
    } else if (allCommands.length) {
      status.textContent = '';
    } else {
      status.textContent = 'No commands available';
    }
    updateOptionsVisibility();
    updateAiControls();
  };

  const updateOptionsVisibility = () => {
    opts.style.display = select.value === 'generate_dal' ? 'flex' : 'none';
  };
  const updateAiControls = () => {
    const copyBtn = document.getElementById('cmd-copy');
    const aiBtn = document.getElementById('cmd-ai-run');
    const meta = commandMeta[select.value];
    const aiLevel = meta?.ai || 'none';
    const showAi = aiLevel !== 'none';
    copyBtn.style.display = showAi ? 'inline-flex' : 'none';
    aiBtn.style.display = showAi ? 'inline-flex' : 'none';
    aiBtn.disabled = !aiAvailable;
    runBtn.disabled = aiLevel === 'required';
  };

  try {
    const data = await fetchJson('/api/commands');
    commandMeta = {};
    allCommands = data.commands || [];
    aiAvailable = Boolean(data.aiAvailable);
    commandBindings = data.bindings || {};
    allCommands.forEach(cmd => {
      commandMeta[cmd.name] = cmd;
    });
    refreshCommandList();
  } catch (e) {
    status.textContent = e.message;
  }

  select.onchange = () => {
    updateOptionsVisibility();
    updateAiControls();
  };
  updateOptionsVisibility();
  updateAiControls();

  const copyBtn = document.getElementById('cmd-copy');
  const aiBtn = document.getElementById('cmd-ai-run');

  copyBtn.onclick = async () => {
    const command = select.value;
    if (!command) return;
    const output = document.getElementById('cmd-output');
    output.style.display = 'block';
    try {
      const data = await fetchJson(`/api/prompt?command=${encodeURIComponent(command)}`);
      await navigator.clipboard.writeText(data.prompt);
      output.textContent = 'Prompt copied to clipboard.';
    } catch (e) {
      output.textContent = e.message;
    }
  };

  aiBtn.onclick = async () => {
    const command = select.value;
    if (!command) return;
    const output = document.getElementById('cmd-output');
    output.style.display = 'block';
    if (!aiAvailable) {
      output.textContent = 'AI key not configured. Add OPENAI_API_KEY to .env.';
      return;
    }
    output.textContent = 'AI runner not configured yet. Use Copy Prompt.';
  };

  runBtn.onclick = async () => {
    const command = select.value;
    if (!command) return;
    status.textContent = `Running ${command}...`;
    runBtn.disabled = true;
    const output = document.getElementById('cmd-output');
    output.style.display = 'block';
    output.textContent = '';
    console.log(`[cmd] start ${command}`);
    const options = {};
    if (command === 'generate_dal') {
      options.dalTests = document.getElementById('opt-dal-tests').checked;
      options.dalServices = document.getElementById('opt-dal-services').checked;
    }
    try {
      const result = await fetchJson('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, options }),
      });
      const summary = result.code === 0 ? 'OK' : `Exit ${result.code}`;
      status.textContent = `${command}: ${summary}`;
      const parts = [];
      if (result.out) parts.push(result.out.trim());
      if (result.err) parts.push(result.err.trim());
      output.textContent = parts.filter(Boolean).join('\n');
      if (!output.textContent) output.textContent = '(no output)';
      console.log(`[cmd] ${command} -> ${summary}`);
      if (output.textContent) console.log(output.textContent);
      if (result.out) console.log(result.out);
      if (result.err) console.warn(result.err);
    } catch (e) {
      status.textContent = e.message;
      output.textContent = e.message;
      console.warn(`[cmd] ${command} failed: ${e.message}`);
    } finally {
      runBtn.disabled = false;
    }
  };
}

/**
 * Creates a sidebar navigation item element for a document.
 * @param {{id:string, label:string, file:string}} doc - The document descriptor.
 * @returns {HTMLElement} A div element ready to append to the nav.
 */
function navItem(doc) {
  const el = document.createElement('div');
  el.className = 'nav-item';
  el.dataset.docId = doc.id;
  const ext = doc.file ? (doc.file.endsWith('.json') ? 'json' : 'md') : '';
  const iconClass = ext === 'json' ? 'icon icon-json' : ext === 'md' ? 'icon icon-md' : 'icon icon-file';
  el.innerHTML = `<span class="${iconClass}"></span><span class="label">${doc.label}</span>`;
  el.onclick = () => loadDoc(doc);
  return el;
}


// ── Search ─────────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.nav-item').forEach(item => {
    const label = item.querySelector('.label').textContent.toLowerCase();
    item.style.display = !q || label.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('.phase-section').forEach(sec => {
    const visible = [...sec.querySelectorAll('.nav-item')].some(i => i.style.display !== 'none');
    sec.style.display = visible ? '' : 'none';
    if (q && visible) sec.classList.add('open');
  });
});


// ── Doc Loader ─────────────────────────────────────────────────────────────────

/**
 * Loads and renders a document, updating the nav active state, breadcrumb,
 * history, and editor state.
 * @param {{id:string, label:string, file:string|null, docType:string}} doc - Doc descriptor.
 * @param {{pushHistory?: boolean}} [opts] - Options.
 */
async function loadDoc(doc, { pushHistory = true } = {}) {
  // update active state
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.docId === doc.id)
  );
  // open the parent phase
  document.querySelectorAll('.phase-section').forEach(sec => {
    if (sec.querySelector(`[data-doc-id="${doc.id}"]`)) sec.classList.add('open');
  });

  // push a history entry so back/forward works
  if (pushHistory) {
    const url = '#doc=' + encodeURIComponent(doc.id);
    history.pushState({ docId: doc.id }, doc.label || doc.id, url);
  }

  activeId = doc.id;
  refreshCommandList();
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('doc-body').innerHTML = '';
  document.getElementById('doc-meta').style.display = 'none';
  activeRawOverride = false;

  // breadcrumb
  const phase = findPhase(doc.id);
  document.getElementById('breadcrumb').innerHTML =
    `${phase ? phase.label + ' <span class="sep">></span> ' : ''}<span class="current">${doc.label}</span>`;

  // Virtual docs (no file) skip the fetch
  if (doc.file === null) {
    document.getElementById('loading').style.display = 'none';
    activeDoc = doc;
    activeContent = '';
    activeRenderedFrom = null;
    editing = false;
    showMeta(doc, '');
    showDocBody();
    await renderDoc(doc, null, null);
    return;
  }

  try {
    const { content, ext, renderedFrom } = await fetchJson(`/api/doc/${encodeURIComponent(doc.file)}`);

    document.getElementById('loading').style.display = 'none';
    activeDoc = doc;
    activeContent = content;
    activeRenderedFrom = renderedFrom || activeRenderedFrom || null;
    editing = false;
    showMeta(doc, ext);
    showDocBody();
    await renderDoc(doc, content, ext, renderedFrom);
  } catch (err) {
    clientLog('error', 'Document load failed', { docId: doc.id, file: doc.file, error: err && err.message ? err.message : String(err) });
    document.getElementById('loading').style.display = 'none';
    document.getElementById('doc-body').innerHTML = `<p style="color:red">Error loading document: ${err.message}</p>`;
  }
}

/**
 * Finds the phase that contains a document with the given ID.
 * @param {string} docId - The document ID.
 * @returns {{id:string, label:string}|null} The phase object, or null.
 */
function findPhase(docId) {
  for (const phase of tree) {
    if ((phase.docs || []).some(d => d.id === docId)) return phase;
    for (const g of (phase.groups || []))
      if (groupDocs(g).some(d => d.id === docId)) return phase;
  }
  return null;
}

/**
 * Renders the document metadata bar (file badge, edit button, raw/template toggle).
 * @param {{id:string, label:string, file:string|null, docType:string}} doc - Current doc.
 * @param {string} ext - File extension (e.g. 'md', 'json').
 */
function showMeta(doc, ext) {
  const meta = document.getElementById('doc-meta');
  meta.style.display = 'flex';
  const canEdit = doc.id && (
    doc.id.match(/^uc-/) || doc.id.match(/^ent-/) || doc.id.match(/^mod-\d+/) ||
    doc.id.startsWith('requirements-')
  );
  const extBadge  = ext ? `<span class="meta-badge ${ext}">${ext.toUpperCase()}</span>` : '';
  const fileBadge = doc.file ? `<span class="meta-badge">${doc.file}</span>` : '';
  const toggleLabel = activeRenderedFrom
    ? (activeRawOverride ? 'Template View' : 'Raw JSON')
    : '';
  const toggleBtn = activeRenderedFrom
    ? `<button class="btn-edit" onclick="toggleTemplateView()">${toggleLabel}</button>`
    : '';
  meta.innerHTML = `${extBadge}${fileBadge}
    ${toggleBtn}
    ${canEdit ? `<button class="btn-edit" onclick="startEdit()">Edit</button>` : ''}`;
}

/**
 * Toggles between the template-rendered view and the raw JSON view for the
 * currently active document.
 */
async function toggleTemplateView() {
  if (!activeDoc?.file) return;
  activeRawOverride = !activeRawOverride;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('doc-body').innerHTML = '';
  try {
    const suffix = activeRawOverride ? '?raw=1' : '';
    const { content, ext, renderedFrom } = await fetchJson(`/api/doc/${encodeURIComponent(activeDoc.file)}${suffix}`);
    activeContent = content;
    activeRenderedFrom = renderedFrom || null;
    showMeta(activeDoc, ext);
    showDocBody();
    await renderDoc(activeDoc, content, ext, renderedFrom);
  } catch (err) {
    clientLog('error', 'Template/raw toggle failed', { docId: activeDoc.id, file: activeDoc.file, error: err && err.message ? err.message : String(err) });
    document.getElementById('doc-body').innerHTML = `<p style="color:red">Error loading document: ${err.message}</p>`;
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}


// ── Renderers ──────────────────────────────────────────────────────────────────

// ── Renderer Registry ──────────────────────────────────────────────────────────
//
// Three-tier dispatch driven by document-catalog.json:
//
//   Tier 1 — VIRTUAL_FNS:   catalog renderMode="virtual"  → custom async function
//   Tier 2 — templateRef:   catalog templateRef set       → fetch template + Mustache → markdown
//   Tier 3 — FORMAT_FNS:    catalog format / file ext     → format fallback
//
// To add a new document type: add a catalog entry. Only add here if truly virtual.

// Tier 1: virtual docs — compute their own data, no file on disk
const VIRTUAL_FNS = {
  'erd':              (body) => renderERD(body),
  'entity-catalogue': (body) => renderEntityCatalogue(body),
};

// Pattern fallbacks for docs where docType may not be set (scanned files)
const PATTERN_DOCTYPE = [
  { test: (doc) => doc.file && doc.file.match(/\/ent-[^/]+\.json$/),       docType: 'entity'       },
  { test: (doc) => doc.file && doc.file.match(/\/module-[^/]+\.json$/),    docType: 'module-spec'  },
  { test: (doc) => doc.file && doc.file.match(/\/sample-data\/[^/]+\.json$/), docType: 'sample-data' },
  { test: (doc) => doc.id === 'erd',                                        docType: 'erd'          },
  { test: (doc) => doc.id === 'entity-catalogue',                           docType: 'entity-catalogue' },
];

// Tier 3: format fallbacks
const _plain = (body, _doc, content) => renderPlainText(body, content);
const FORMAT_FNS = {
  'md':   (body, doc,  content) => renderMarkdown(body, content, doc.file),
  'sql':  _plain,
  'sh':   _plain,
  'txt':  _plain,
  // source code — show as-is, no processing
  'code': _plain,
  'ts':   _plain,
  'js':   _plain,
  'py':   _plain,
  'jsonl':(body, _doc, content) => {
    const entries = content.split('\n').map(l => l.trim()).filter(Boolean).map(l => parseJsonSafe(l, 'entry'));
    renderCommandLog(body, { entries });
  },
};

// Custom renderers for complex types that can't be expressed as a simple template.
// These are called from renderFromCatalog when templateRef is null and format is json.
const CUSTOM_FNS = {
  'root-configuration': (body, _doc, content) => renderConfiguration(body, parseJsonSafe(content, 'configuration')),
  'application':        (body, _doc, content) => renderApplication(body, parseJsonSafe(content, 'application definition')),
  'project-state':      (body, _doc, content) => renderProjectState(body, parseJsonSafe(content, 'project state')),
  'command-log':        (body, _doc, content) => {
    const entries = content.split('\n').map(l => l.trim()).filter(Boolean).map(l => parseJsonSafe(l, 'command log entry'));
    renderCommandLog(body, { entries });
  },
  'logical-data-model': (body, _doc, content) => renderLogicalDataModel(body, parseJsonSafe(content, 'logical data model')),
  'module-catalog':     (body, _doc, content) => renderModuleCatalog(body, parseJsonSafe(content, 'module catalog')),
  'module-spec':        (body, doc,  content) => renderModuleSpec(body, parseJsonSafe(content, `module spec (${doc.id})`)),
  'entity':             (body, doc,  content) => renderEntity(body, parseJsonSafe(content, `entity spec (${doc.id})`)),
  'trace-matrix':       (body, _doc, content) => renderTraceMatrix(body, parseJsonSafe(content, 'trace matrix')),
};

// ── Template engine (Tier 2) ───────────────────────────────────────────────────

const _templateCache = {};

async function fetchTemplate(name) {
  if (_templateCache[name]) return _templateCache[name];
  const res = await fetch(`/api/template/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Template not found: ${name}`);
  const text = await res.text();
  _templateCache[name] = text;
  return text;
}

/**
 * Normalizes raw document data into a shape the template can use.
 * Each docType that has a templateRef gets a normalizer here.
 */
function normalizeForTemplate(docType, data, doc) {
  if (docType === 'sample-data') {
    const rows  = Array.isArray(data) ? data : (data.rows || data.data || []);
    const title = Array.isArray(data) ? (doc.label || 'Sample Data') : (data.entity || doc.label || 'Sample Data');
    if (!rows.length) return { title, count: 0, header: '', separator: '', rows: [] };
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const esc  = s => String(s ?? '').replace(/\|/g, '\\|');
    return {
      title,
      count: rows.length,
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
        id:          cap.id,
        name:        cap.name,
        description: cap.description || '',
        children: (cap.functions || []).map(fn => ({
          id:       fn.id,
          name:     fn.name,
          parentId: fn.parent_id || '',
          outcomes: (fn.outcomes || []).map(o => ({ '.': o })),
        })),
      })),
    };
  }

  if (docType === 'root-configuration') {
    const SECTION_KEYS = ['project', 'mde', 'ba', 'design', 'project_state', 'application', 'output', 'test', 'scripts'];
    const toTitle = k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const sections = SECTION_KEYS
      .filter(k => data[k] && typeof data[k] === 'object')
      .map(k => ({
        title: toTitle(k),
        rows: Object.entries(data[k])
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, val]) => ({ key, value: String(val ?? '') })),
      }))
      .filter(s => s.rows.length);
    return { sections };
  }

  return data;
}

async function renderFromTemplate(body, doc, content, templateRef) {
  try {
    const template = await fetchTemplate(templateRef);
    const docType  = doc.docType;
    const raw      = parseJsonSafe(content, docType);
    const data     = normalizeForTemplate(docType, raw, doc);
    const markdown = Mustache.render(template, data);
    renderMarkdown(body, markdown, doc.file);
  } catch (e) {
    body.innerHTML = `<div class="doc-section"><p style="color:var(--error)">Template error: ${escHtml(String(e))}</p></div>`;
  }
}

/**
 * Dispatches rendering for a document.
 *
 * Resolution order (all driven by document-catalog.json):
 *   1. renderedFrom → renderMarkdown
 *   2. Tier 1: catalog renderMode="virtual" → VIRTUAL_FNS
 *   3. Tier 2: catalog templateRef set      → fetchTemplate + Mustache → markdown
 *   4. Tier 3: CUSTOM_FNS (complex json types with no template)
 *   5. Tier 3: catalog format / ext         → FORMAT_FNS
 *   6. Fallback → renderJson
 */
async function renderDoc(doc, content, ext, renderedFrom) {
  console.debug('[renderDoc]', { id: doc.id, docType: doc.docType, ext, renderedFrom: !!renderedFrom });
  const body = document.getElementById('doc-body');

  if (renderedFrom) { renderMarkdown(body, content, doc.file); return; }

  // Resolve effective docType (may be inferred from file pattern)
  let docType = doc.docType;
  if (!docType) {
    for (const p of PATTERN_DOCTYPE) {
      if (p.test(doc)) { docType = p.docType; break; }
    }
  }

  const catalogEntry = docType ? catalog[docType] : null;

  // Tier 1: virtual
  if (catalogEntry?.renderMode === 'virtual' || VIRTUAL_FNS[docType]) {
    VIRTUAL_FNS[docType]?.(body);
    return;
  }

  // Tier 2: template — only for JSON-format docs (templateRef on md docs is an AI guide, not a view template)
  if (catalogEntry?.templateRef && catalogEntry?.format === 'json') {
    await renderFromTemplate(body, { ...doc, docType }, content, catalogEntry.templateRef);
    return;
  }

  // Tier 3a: custom complex renderer
  if (docType && CUSTOM_FNS[docType]) {
    CUSTOM_FNS[docType](body, doc, content);
    return;
  }

  // Tier 3b: format fallback
  const format = catalogEntry?.format;
  if (format && FORMAT_FNS[format]) { FORMAT_FNS[format](body, doc, content); return; }
  if (ext    && FORMAT_FNS[ext])    { FORMAT_FNS[ext](body, doc, content);    return; }

  // Fallback
  renderJson(body, content);
}

/**
 * Resolves a relative href against a base file path, normalising `..` segments.
 * @param {string|null} baseFile - The base file path (e.g. `use-cases/uc-01.md`).
 * @param {string} href - The relative link href.
 * @returns {string} Resolved path.
 */
function resolveRelPath(baseFile, href) {
  const baseDir = baseFile ? baseFile.replace(/\/[^/]+$/, '') : '';
  const parts = (baseDir ? baseDir + '/' + href : href).split('/');
  const out = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.') out.push(p);
  }
  return out.join('/');
}

/**
 * Renders Markdown content into the body element, including Mermaid diagrams,
 * syntax highlighting, and intercepted relative links.
 * @param {HTMLElement} body - The container to render into.
 * @param {string} content - Markdown source text.
 * @param {string|null} baseFile - Base file path for resolving relative links.
 */
function renderMarkdown(body, content, baseFile) {
  body.innerHTML = `<div class="md-body">${marked.parse(content)}</div>`;
  body.querySelectorAll('pre code').forEach(el => {
    if (el.classList.contains('language-mermaid')) {
      const pre = el.parentElement;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = el.textContent;
      pre.replaceWith(div);
    } else {
      hljs.highlightElement(el);
    }
  });
  const mermaidNodes = body.querySelectorAll('.mermaid');
  if (mermaidNodes.length && typeof mermaid !== 'undefined') mermaid.run({ nodes: mermaidNodes });

  // Intercept relative links -> load in viewer
  if (baseFile) {
    body.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
      a.addEventListener('click', e => {
        e.preventDefault();
        const resolved = resolveRelPath(baseFile, href);
        const id = resolved.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'doc';
        const doc = findDocById(id) || { id, label: a.textContent.trim() || resolved, file: resolved, docType: 'file' };
        _adHocDocs[id] = doc;
        loadDoc(doc);
      });
    });
  }
}

/**
 * Renders plain text content (SQL, shell scripts, etc.) into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {string} content - Raw text content.
 */
function renderPlainText(body, content) {
  body.innerHTML = `<div class="json-body"><pre><code>${escHtml(content)}</code></pre></div>`;
}

/**
 * Renders a JSON document with syntax highlighting into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {string} content - Raw JSON string.
 */
function renderJson(body, content) {
  const formatted = JSON.stringify(parseJsonSafe(content, 'JSON document'), null, 2);
  body.innerHTML = `<div class="json-body"><pre><code class="language-json">${escHtml(formatted)}</code></pre></div>`;
  body.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
}


// ── Trace Matrix Renderer ──────────────────────────────────────────────────────

/**
 * Renders the traceability matrix document into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {{traces: Array, summary: Object}} data - Parsed trace matrix data.
 */
function renderTraceMatrix(body, data) {
  const { traces, summary } = data;

  let html = `<div class="md-body"><h1>Traceability Matrix</h1></div>`;

  // Summary cards
  html += `<div class="summary-grid">
    <div class="summary-card"><div class="val">${summary.totalRequirements}</div><div class="lbl">Requirements</div></div>
    <div class="summary-card"><div class="val green">${summary.fullyTraced}</div><div class="lbl">Fully Traced</div></div>
    <div class="summary-card"><div class="val yellow">${summary.partiallyTraced}</div><div class="lbl">Partial</div></div>
    <div class="summary-card"><div class="val blue">${summary.testCoverage.totalTestCases}</div><div class="lbl">Test Cases</div></div>
    <div class="summary-card"><div class="val">${summary.testCoverage.requirementsWithTests}</div><div class="lbl">BRs with Tests</div></div>
  </div>`;

  // Main table
  html += `<table class="trace-table">
    <thead><tr>
      <th>ID</th>
      <th>Requirement</th>
      <th>Function</th>
      <th>Modules</th>
      <th>Tests</th>
      <th>AC</th>
      <th>Status</th>
    </tr></thead><tbody>`;

  traces.forEach(t => {
    const mods = (t.modules || []).map(m => `<span class="tag mod">${m}</span>`).join('');
    const tests = (t.tests || []).map(tc => `<span class="tag test">${tc}</span>`).join('');
    const acs = (t.acceptanceCriteria || []).map(a => `<span class="tag ac">${a}</span>`).join('');
    html += `<tr>
      <td class="req-id">${t.requirementId}</td>
      <td class="req-text">${escHtml(t.requirementText)}</td>
      <td><span class="tag">${escHtml(t.businessFunction)}</span></td>
      <td><div class="tags">${mods}</div></td>
      <td><div class="tags">${tests || '<span style="color:#9ca3af;font-size:11px">-</span>'}</div></td>
      <td><div class="tags">${acs || '<span style="color:#9ca3af;font-size:11px">-</span>'}</div></td>
      <td><span class="status-badge status-${t.status}">${t.status}</span></td>
    </tr>`;
  });

  html += `</tbody></table>`;

  // Gaps section
  if (summary.openGaps?.length) {
    html += `<div class="md-body"><h2>Open Gaps</h2></div>`;
    html += `<table class="trace-table"><thead><tr><th>Requirement</th><th>Gap</th></tr></thead><tbody>`;
    summary.openGaps.forEach(g => {
      html += `<tr><td class="req-id">${g.requirementId}</td><td>${escHtml(g.gap)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  body.innerHTML = html;
}


// ── Project State Renderer ─────────────────────────────────────────────────────

/**
 * Renders the project state document into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {Object|null} data - Parsed project-state JSON data.
 */

// ── Configuration Renderer ────────────────────────────────────────────────────

function renderConfiguration(body, data) {
  function section(title, obj) {
    if (!obj || typeof obj !== 'object') return '';
    const rows = Object.entries(obj)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(String(v ?? ''))}</td></tr>`)
      .join('');
    return rows ? `<h3>${escHtml(title)}</h3><table class="cat-table"><tbody>${rows}</tbody></table>` : '';
  }

  let html = `<div class="md-body"><h1>Configuration</h1>`;
  html += section('Project', data.project);
  html += section('MDE Framework', data.mde);
  html += section('Business Analysis', data.ba);
  html += section('Design', data.design);
  html += section('Project State', data.project_state);
  html += section('Application', data.application);
  html += section('Output', data.output);
  if (data.test) html += section('Test', data.test);
  if (data.scripts) html += section('Scripts', data.scripts);
  html += `</div>`;
  body.innerHTML = html;
}

function renderProjectState(body, data) {
  if (!data) { body.innerHTML = '<p style="color:red">Could not parse project state.</p>'; return; }
  const row = (label, val) => val != null && val !== ''
    ? `<tr><th>${escHtml(label)}</th><td>${escHtml(String(val))}</td></tr>` : '';
  let html = `<div class="md-body"><h1>Project State</h1>
  <table>
    ${row('Project', data.project)}
    ${row('Status', data.status)}
    ${row('Current Phase', data.current_phase || data.currentPhase)}
    ${row('Last Command', data.last_command)}
    ${row('Last Run', data.last_run_at)}
    ${row('Recommended Next', data.recommended_next_command)}
  </table>`;

  if (Array.isArray(data.next_valid_commands) && data.next_valid_commands.length) {
    html += `<h2>Next Valid Commands</h2><table><thead><tr><th>Command</th><th>Reason</th></tr></thead><tbody>`;
    data.next_valid_commands.forEach(c => {
      html += `<tr><td><code>${escHtml(c.command||'')}</code></td><td>${escHtml(c.reason||'')}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  if (Array.isArray(data.completed_commands) && data.completed_commands.length) {
    html += `<h2>Completed Commands</h2><ul>` +
      data.completed_commands.map(c => `<li><code>${escHtml(c)}</code></li>`).join('') +
      `</ul>`;
  }

  if (data.artifacts && typeof data.artifacts === 'object') {
    const entries = Object.entries(data.artifacts);
    if (entries.length) {
      html += `<h2>Artifacts</h2><table><thead><tr><th>File</th><th>Status</th></tr></thead><tbody>`;
      entries.forEach(([file, status]) => {
        html += `<tr><td><code>${escHtml(file)}</code></td><td>${escHtml(String(status))}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
  }

  html += `</div>`;
  body.innerHTML = html;
}


// ── Command Log Renderer ───────────────────────────────────────────────────────

/**
 * Renders the command log document into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {Object|null} data - Parsed command-log JSON data.
 */
function renderCommandLog(body, data) {
  const entries = (data && data.entries) || [];
  let html = `<div class="md-body"><h1>Command Log</h1>`;
  if (entries.length === 0) {
    html += `<p><em>No entries yet.</em></p></div>`;
    body.innerHTML = html;
    return;
  }
  html += `<table><thead><tr>
    <th>Time</th><th>Command</th><th>Label</th><th>AI</th><th>Status</th><th>Duration</th><th>Outputs</th>
  </tr></thead><tbody>`;
  for (const e of entries) {
    const time = e.ran_at ? new Date(e.ran_at).toLocaleString() : '';
    const dur  = e.duration_ms != null ? (e.duration_ms / 1000).toFixed(1) + 's' : '';
    const ai   = e.ai ? 'yes' : 'no';
    const outs = (e.outputs || []).map(o => `<code>${o}</code>`).join('<br>');
    const cost = e.cost_estimate
      ? `in:${e.cost_estimate.input_tokens||'?'} out:${e.cost_estimate.output_tokens||'?'}`
      : '';
    const statusCell = cost ? `${e.status||''}<br><small>${cost}</small>` : (e.status || '');
    html += `<tr>
      <td>${time}</td>
      <td><code>${e.command || ''}</code></td>
      <td>${e.label || ''}</td>
      <td>${ai}</td>
      <td>${statusCell}</td>
      <td>${dur}</td>
      <td>${outs}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  body.innerHTML = html;
}


// ── Module Catalog Renderer ────────────────────────────────────────────────────

/**
 * Renders the flat module catalog table into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {{project:string, version:string, modules:Array}} data - Parsed module catalog data.
 */
function renderModuleCatalog(body, data) {
  const catalog = data.catalog || data;
  const modules = catalog.modules || data.modules || [];
  const project = catalog.application || data.project || '';
  const version = catalog.version || data.version || '';
  let html = `<div class="md-body"><h1>Module Catalog</h1>
    <p>${modules.length} modules${project ? ` - <strong>${escHtml(project)}</strong>` : ''}${version ? ` v${escHtml(version)}` : ''}</p></div>
    <table class="cat-table">
      <thead><tr><th>ID</th><th>Name</th><th>Layer</th><th>Tier</th><th>Owner</th><th>Depends On</th></tr></thead>
      <tbody>`;
  modules.forEach(m => {
    const id   = m.moduleId || m.id || '';
    const name = m.moduleName || m.displayName || m.name || '';
    const layer = m.layer || m.type || '';
    const tier  = m.tier || '';
    const owner = m.owner || '';
    const deps  = (m.dependencies || []).join(', ');
    html += `<tr class="cat-row" onclick="showModulePopover('${escHtml(id)}', this)" data-module-id="${escHtml(id)}">
      <td><code>${escHtml(id)}</code></td>
      <td>${escHtml(name)}</td>
      <td>${layer ? `<span class="layer-badge ${escHtml(layer)}">${escHtml(layer)}</span>` : '-'}</td>
      <td>${tier ? `<span class="mc-tier ${escHtml(tier)}">${escHtml(tier)}</span>` : '-'}</td>
      <td>${escHtml(owner)}</td>
      <td style="font-size:12px;color:var(--muted)">${escHtml(deps)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  body.innerHTML = html;
  body._moduleCatalogData = data;
}

const _modulePopoverCache = {};

/**
 * Shows the module detail popover anchored to the given row element, using
 * data cached from the most recently rendered module catalog.
 * @param {string} modId - The module ID to display.
 * @param {HTMLElement} rowEl - The table row element to anchor the popover to.
 */
function showModulePopover(modId, rowEl) {
  const data = document.getElementById('doc-body')._moduleCatalogData;
  if (!data) return;
  const m = data.modules.find(x => (x.moduleId || x.id) === modId);
  if (!m) return;
  _modulePopoverCache[modId] = m;

  const _id    = m.moduleId || m.id || '';
  const _name  = m.moduleName || m.displayName || m.name || '';
  const _layer = m.layer || m.type || '';
  const _tier  = m.tier || '';

  const pop = document.getElementById('mod-popover');
  pop.querySelector('#mpop-name').textContent = _name;
  pop.querySelector('#mpop-meta').innerHTML =
    `<code>${escHtml(_id)}</code>
     ${_layer ? `<span class="layer-badge ${escHtml(_layer)}">${escHtml(_layer)}</span>` : ''}
     ${_tier  ? `<span class="mc-tier ${escHtml(_tier)}">${escHtml(_tier)}</span>` : ''}
     <span style="font-size:11px;color:var(--muted)">owner: ${escHtml(m.owner || '')}</span>`;
  pop.querySelector('#mpop-desc').textContent = m.description || (m.responsibilities || []).join('; ') || '';
  const deps = (m.dependencies || []).map(d => `<span class="tag">${escHtml(d)}</span>`).join('');
  const reqs = (m.requirements || []).map(r => `<span class="tag ac">${escHtml(r)}</span>`).join('');
  pop.querySelector('#mpop-deps').innerHTML = deps || '<span style="color:var(--muted);font-size:12px">none</span>';
  pop.querySelector('#mpop-reqs').innerHTML = reqs || '<span style="color:var(--muted);font-size:12px">none</span>';

  const rect = rowEl.getBoundingClientRect();
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = Math.min(rect.left, window.innerWidth - 360) + 'px';
  pop.style.display = 'block';
}

/**
 * Renders the module catalog grouped by architectural layer into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {{project:string, version:string, modules:Array}} data - Parsed module catalog data.
 */
function renderModuleCatalogByLayer(body, data) {
  const LAYER_ORDER = ['VIEW', 'CTRL', 'SVC', 'BL', 'DAL'];
  const LAYER_DESC  = {
    VIEW: 'UI rendering and client-side state',
    CTRL: 'HTTP route handling and request mapping',
    SVC:  'Use-case orchestration - coordinates BL, DAL, and adapters',
    BL:   'Pure domain rules and calculations - no I/O',
    DAL:  'Data access - SQL, ORM, repositories',
  };

  const byLayer = {};
  for (const m of data.modules) {
    const layer = (m.layer || m.type || 'UNCLASSIFIED').toUpperCase();
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(m);
  }

  const layers = [...LAYER_ORDER.filter(l => byLayer[l]), ...Object.keys(byLayer).filter(l => !LAYER_ORDER.includes(l))];

  let html = `<div class="md-body"><h1>Module Catalogue - By Layer</h1>
    <p>${data.modules.length} modules &nbsp;&middot;&nbsp; <strong>${data.project}</strong> v${data.version}</p></div>`;

  for (const layer of layers) {
    const modules = byLayer[layer] || [];
    html += `<div class="layer-section">
      <div class="layer-section-header">
        <span class="layer-badge ${escHtml(layer)}">${escHtml(layer)}</span>
        <span class="layer-section-name">${escHtml(LAYER_DESC[layer] || layer)}</span>
        <span class="layer-count">${modules.length} module${modules.length !== 1 ? 's' : ''}</span>
      </div>`;

    for (const m of modules) {
      const _id   = m.moduleId || m.id || '';
      const _name = m.moduleName || m.displayName || m.name || '';
      const _tier = m.tier || '';
      const _desc = m.description || (m.responsibilities || []).join('; ') || '';
      const deps  = (m.dependencies || []).map(d => `<span class="tag">${d}</span>`).join('');
      html += `<div class="module-card">
        <div class="mc-header">
          <span class="mc-id">${escHtml(_id)}</span>
          <span class="mc-name">${escHtml(_name)}</span>
          ${_tier ? `<span class="mc-tier ${escHtml(_tier)}">${escHtml(_tier)}</span>` : ''}
        </div>
        <div class="mc-desc">${escHtml(_desc)}</div>
        ${m.owner ? `<div class="mc-row"><span class="lbl">Owner</span><span>${escHtml(m.owner)}</span></div>` : ''}
        ${deps ? `<div class="mc-row"><span class="lbl">Depends on</span><div class="tags">${deps}</div></div>` : ''}
      </div>`;
    }
    html += `</div>`;
  }

  body.innerHTML = html;
}

/**
 * Fetches all entities from the API and renders the entity catalogue table.
 * @param {HTMLElement} body - The container to render into.
 */
async function renderEntityCatalogue(body) {
  body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">Loading...</div>`;
  let entities;
  try { entities = await fetchJson('/api/entities'); }
  catch (e) { body.innerHTML = `<p style="color:red">Failed to load entities: ${e.message}</p>`; return; }

  const MANAGED_LABELS = { system:'System', ui:'UI', external:'External' };
  const SOURCE_LABELS  = { external:'External', seed:'Seed', 'user-generated':'User Generated', 'data-conversion':'Data Conversion' };
  let html = `<div class="md-body"><h1>Entity Catalogue</h1>
    <p>${entities.length} entities</p></div>
    <table class="cat-table">
      <thead><tr><th>Entity</th><th>Category</th><th>Managed By</th><th>Source</th><th>Module</th><th>Fields</th><th>States</th></tr></thead>
      <tbody>`;
  for (const e of entities) {
    const catM   = CAT_META[e.category] || {};
    const mLabel = MANAGED_LABELS[e.managedBy] || e.managedBy || '-';
    const sLabel = SOURCE_LABELS[e.source]     || e.source     || '-';
    html += `<tr class="cat-row" onclick="navigateTo('${escHtml(e.entityId)}')" style="cursor:pointer">
      <td><strong>${escHtml(e.entityName)}</strong><br><span style="font-size:11px;color:var(--muted);font-family:monospace">${escHtml(e.entityId)}</span></td>
      <td><span class="cat-badge ${escHtml(e.category || '')}" style="background:${catM.bg||'#e5e7eb'};color:${catM.text||'#374151'}">${escHtml(e.category||'-')}</span></td>
      <td><span class="managed-badge ${escHtml(e.managedBy||'')}">${escHtml(mLabel)}</span></td>
      <td><span class="source-badge ${escHtml(e.source||'')}">${escHtml(sLabel)}</span></td>
      <td style="font-size:12px">${escHtml(e.owningModule||'-')}</td>
      <td style="text-align:center;color:var(--muted)">${(e.fields||[]).length}</td>
      <td style="text-align:center;color:var(--muted)">${(e.stateMachine?.states||[]).length||'-'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  body.innerHTML = html;
}

// close module popover on outside click
document.addEventListener('click', e => {
  const pop = document.getElementById('mod-popover');
  if (pop && !pop.contains(e.target) && !e.target.closest('.cat-row')) pop.style.display = 'none';
});


// ── ERD Renderer ───────────────────────────────────────────────────────────────
const CAT_META = {
  'aggregate-root': { label: 'Aggregate Root', bg: '#1d4ed8', border: '#1e40af', text: '#fff' },
  'supporting':     { label: 'Supporting',     bg: '#16a34a', border: '#15803d', text: '#fff' },
  'infrastructure': { label: 'Infrastructure', bg: '#7c3aed', border: '#6d28d9', text: '#fff' },
  'reference-data': { label: 'Reference Data', bg: '#ea580c', border: '#c2410c', text: '#fff' },
};
const SKIP_REL = new Set(['belongs-to', 'referenced-by']);
const CARD_LABEL = { 'has-one': '1:1', 'has-many': '1:N', 'references': 'ref' };

let _erdCy = null;
const ERD_STORAGE_KEY = 'eop-erd-layout-v2';

const NODE_SIZES = [
  { w: 'label', h: 'label', pad: '12px' },   // 0 - auto (label-sized)
  { w: 160,     h: 52,      pad: null  },     // 1 - medium
  { w: 220,     h: 70,      pad: null  },     // 2 - large
];

/**
 * Applies a named size preset to a Cytoscape node.
 * @param {cytoscape.NodeSingular} node - The Cytoscape node.
 * @param {number} idx - Index into NODE_SIZES.
 */
function applyNodeSize(node, idx) {
  const s = NODE_SIZES[idx] || NODE_SIZES[0];
  if (s.w === 'label') {
    node.style({ width: 'label', height: 'label', padding: s.pad });
  } else {
    node.style({ width: s.w, height: s.h, padding: '0px' });
  }
}

/**
 * Persists the current ERD node positions and sizes to localStorage.
 */
function erdSaveLayout() {
  if (!_erdCy) return;
  const state = {};
  _erdCy.nodes().forEach(n => {
    const entry = { x: n.position('x'), y: n.position('y'), sizeIdx: n.data('sizeIdx') || 0 };
    const cw = n.data('customW');
    if (cw) { entry.customW = cw; entry.customH = n.data('customH'); }
    state[n.id()] = entry;
  });
  localStorage.setItem(ERD_STORAGE_KEY, JSON.stringify(state));
  const btn = document.getElementById('erd-save-btn');
  if (btn) { btn.textContent = 'Saved OK'; btn.classList.add('on'); setTimeout(() => { btn.textContent = 'Save Layout'; btn.classList.remove('on'); }, 1500); }
}

/**
 * Clears the saved ERD layout from localStorage and resets all node sizes,
 * then re-runs the cose layout algorithm.
 */
function erdResetLayout() {
  if (!_erdCy) return;
  localStorage.removeItem(ERD_STORAGE_KEY);
  _erdCy.nodes().forEach(n => {
    n.data('sizeIdx', 0); n.removeData('customW'); n.removeData('customH');
    applyNodeSize(n, 0);
  });
  erdLayout('cose');
}

/**
 * Restores ERD node positions and sizes from localStorage.
 * @returns {boolean} True if a saved layout was found and applied.
 */
function erdRestoreLayout() {
  const raw = localStorage.getItem(ERD_STORAGE_KEY);
  if (!raw || !_erdCy) return false;
  try {
    const state = parseJsonSafe(raw, 'ERD layout state');
    _erdCy.nodes().forEach(n => {
      const s = state[n.id()];
      if (!s) return;
      n.position({ x: s.x, y: s.y });
      if (s.customW) {
        n.data('customW', s.customW); n.data('customH', s.customH);
        n.style({ width: s.customW, height: s.customH, padding: '0px' });
      } else if (s.sizeIdx) {
        n.data('sizeIdx', s.sizeIdx); applyNodeSize(n, s.sizeIdx);
      }
    });
    _erdCy.fit(undefined, 40);
    return true;
  } catch { return false; }
}

/**
 * Fetches all entities and renders the interactive Cytoscape ERD diagram.
 * @param {HTMLElement} body - The container to render into.
 */
async function renderERD(body) {
  hideResizeOverlay();
  if (_erdCy) { _erdCy.destroy(); _erdCy = null; }
  body.innerHTML = `<div style="padding:60px;text-align:center;color:var(--muted);font-size:14px">Loading...</div>`;

  let entities;
  try { entities = await fetchJson('/api/entities'); }
  catch (e) { body.innerHTML = `<p style="color:red">Failed to load entities: ${e.message}</p>`; return; }

  const cats = [...new Set(entities.map(e => e.category))].sort();
  const legendHtml = cats.map(c => {
    const m = CAT_META[c] || { label: c, bg: '#6b7280' };
    const n = entities.filter(e => e.category === c).length;
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#374151">
      <span style="width:10px;height:10px;border-radius:2px;background:${m.bg};flex-shrink:0"></span>
      ${escHtml(m.label)} <span style="color:var(--muted)">(${n})</span></span>`;
  }).join('');

  body.innerHTML = `
    <div class="md-body" style="margin-bottom:14px">
      <h1>Entity Relationship Diagram</h1>
      <p>Drag nodes to reposition &middot; double-click a node to resize &middot; click to highlight edges &middot; scroll to zoom</p>
    </div>
    <div class="erd-toolbar">
      ${legendHtml}
      <span style="flex:1"></span>
      <button class="erd-filter-btn" onclick="erdLayout('cose')">Force</button>
      <button class="erd-filter-btn" onclick="erdLayout('breadthfirst')">Tree</button>
      <button class="erd-filter-btn" onclick="erdLayout('circle')">Circle</button>
      <button class="erd-filter-btn" onclick="erdFit()">Fit</button>
      <button class="erd-filter-btn" id="erd-save-btn" onclick="erdSaveLayout()">Save Layout</button>
      <button class="erd-filter-btn" onclick="erdResetLayout()" title="Clear saved layout and reset positions">Reset</button>
    </div>
    <div id="erd-wrap"></div>`;

  const nodes = entities.map(e => ({ data: { id: e.entityId, label: e.entityName, cat: e.category } }));
  const edges = [];
  entities.forEach(e => {
    (e.relationships || []).forEach(r => {
      if (SKIP_REL.has(r.type)) return;
      edges.push({ data: {
        id: `${e.entityId}__${r.entity}__${r.foreignKey}`,
        source: e.entityId, target: r.entity,
        label: `${r.foreignKey}\n${CARD_LABEL[r.type] || r.type}`,
        relType: r.type,
      }});
    });
  });

  const nodeStyles = Object.entries(CAT_META).map(([cat, m]) => ({
    selector: `node[cat = "${cat}"]`,
    style: { 'background-color': m.bg, 'border-color': m.border, 'color': m.text },
  }));

  const erdWrap = document.getElementById('erd-wrap');
  if (!erdWrap) return;

  const initCytoscape = () => {
    _erdCy = cytoscape({
      container: erdWrap,
      elements: { nodes, edges },
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center', 'text-halign': 'center',
            'font-size': '12px', 'font-weight': 'bold',
            'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            'width': 'label', 'height': 'label', 'padding': '12px',
            'border-width': 2, 'shape': 'roundrectangle',
          }
        },
        ...nodeStyles,
        {
          selector: 'node:selected',
          style: { 'border-width': 3, 'border-color': '#f59e0b', 'border-style': 'solid' }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5, 'curve-style': 'bezier',
            'line-color': '#d1d5db',
            'target-arrow-shape': 'triangle', 'target-arrow-color': '#d1d5db',
            'label': 'data(label)',
            'font-size': '9px', 'color': '#6b7280',
            'text-background-color': '#f8fafc', 'text-background-opacity': 1,
            'text-background-padding': '2px', 'text-wrap': 'wrap',
            'edge-text-rotation': 'autorotate',
          }
        },
        {
          selector: 'edge[relType = "has-many"]',
          style: { 'target-arrow-shape': 'triangle', 'line-style': 'solid' }
        },
        {
          selector: 'edge[relType = "has-one"]',
          style: { 'target-arrow-shape': 'tee', 'line-style': 'solid' }
        },
        {
          selector: 'edge[relType = "references"]',
          style: { 'line-style': 'dashed', 'target-arrow-shape': 'vee' }
        },
        {
          selector: 'edge:selected, .highlighted',
          style: { 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6', 'width': 2.5, 'color': '#1d4ed8' }
        },
        {
          selector: '.faded',
          style: { 'opacity': 0.15 }
        },
      ],
      layout: { name: 'preset' },
      userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false,
    });

    _erdCy.on('tap', 'node', function(e) {
      const node = e.target;
      _erdCy.elements().removeClass('highlighted faded');
      const connected = node.connectedEdges();
      connected.addClass('highlighted');
      connected.connectedNodes().not(node).addClass('highlighted');
      _erdCy.elements().not(node).not(connected).not(connected.connectedNodes()).addClass('faded');
      node.removeClass('faded');
    });
    _erdCy.on('tap', function(e) {
      if (e.target === _erdCy) _erdCy.elements().removeClass('highlighted faded');
    });
    _erdCy.on('dbltap', 'node', function(e) {
      const node = e.target;
      const next = ((node.data('sizeIdx') || 0) + 1) % NODE_SIZES.length;
      node.data('sizeIdx', next);
      applyNodeSize(node, next);
      if (_resizeNode && _resizeNode.id() === node.id()) updateResizeOverlayPosition();
    });

    _erdCy.on('tap', 'node', function(e) { showResizeOverlay(e.target); });
    _erdCy.on('tap', function(e) { if (e.target === _erdCy) hideResizeOverlay(); });
    _erdCy.on('drag', 'node', function(e) {
      if (_resizeNode && e.target.id() === _resizeNode.id()) updateResizeOverlayPosition();
    });
    _erdCy.on('pan zoom', function() { if (_resizeNode) updateResizeOverlayPosition(); });

    const restored = erdRestoreLayout();
    if (!restored) {
      _erdCy.layout({ name: 'cose', padding: 40, nodeRepulsion: 10000, idealEdgeLength: 140, animate: false }).run();
      _erdCy.fit(undefined, 40);
    }
  };

  const waitForDimensions = () => {
    const { width, height } = erdWrap.getBoundingClientRect();
    if (width === 0 || height === 0) {
      requestAnimationFrame(waitForDimensions);
    } else {
      initCytoscape();
    }
  };
  requestAnimationFrame(waitForDimensions);
}

/**
 * Runs a named Cytoscape layout algorithm on the ERD.
 * @param {'cose'|'breadthfirst'|'circle'} name - Layout algorithm name.
 */
function erdLayout(name) {
  if (!_erdCy) return;
  const opts = { name, padding: 40, animate: true };
  if (name === 'cose') { opts.nodeRepulsion = 10000; opts.idealEdgeLength = 140; }
  if (name === 'breadthfirst') { opts.directed = true; opts.spacingFactor = 1.8; }
  if (name === 'circle') { opts.spacingFactor = 1.4; }
  _erdCy.layout(opts).run();
}

/**
 * Fits the ERD diagram to the visible viewport with 40px padding.
 */
function erdFit() { if (_erdCy) _erdCy.fit(undefined, 40); }


// ── ERD Node Resize Overlay ────────────────────────────────────────────────────
let _resizeNode = null;
let _resizeDragData = null;

/**
 * Activates the resize overlay for the given ERD node.
 * @param {cytoscape.NodeSingular} node - The node to show the resize handle for.
 */
function showResizeOverlay(node) {
  _resizeNode = node;
  updateResizeOverlayPosition();
  document.getElementById('node-resize-overlay').style.display = 'block';
}

/**
 * Hides the ERD node resize overlay and clears the active node reference.
 */
function hideResizeOverlay() {
  _resizeNode = null;
  document.getElementById('node-resize-overlay').style.display = 'none';
}

/**
 * Repositions the resize overlay to match the current rendered bounding box of
 * the active ERD node, accounting for pan and zoom.
 */
function updateResizeOverlayPosition() {
  if (!_resizeNode || !_erdCy) return;
  const overlay = document.getElementById('node-resize-overlay');
  const wrap = document.getElementById('erd-wrap');
  if (!wrap) { overlay.style.display = 'none'; return; }
  const wrapRect = wrap.getBoundingClientRect();
  const bb = _resizeNode.renderedBoundingBox({ includeLabels: false });
  overlay.style.left   = (wrapRect.left + bb.x1) + 'px';
  overlay.style.top    = (wrapRect.top  + bb.y1) + 'px';
  overlay.style.width  = (bb.x2 - bb.x1) + 'px';
  overlay.style.height = (bb.y2 - bb.y1) + 'px';
}

(function initResizeHandle() {
  const handle = document.getElementById('node-resize-handle');
  handle.addEventListener('mousedown', function(e) {
    if (!_resizeNode || !_erdCy) return;
    e.preventDefault(); e.stopPropagation();
    const bb0 = _resizeNode.renderedBoundingBox({ includeLabels: false });
    const zoom = _erdCy.zoom();
    _resizeDragData = {
      startX: e.clientX, startY: e.clientY,
      startModelW: (bb0.x2 - bb0.x1) / zoom,
      startModelH: (bb0.y2 - bb0.y1) / zoom,
    };
    function onMove(ev) {
      if (!_resizeDragData || !_resizeNode || !_erdCy) return;
      const z = _erdCy.zoom();
      const newW = Math.max(50, _resizeDragData.startModelW + (ev.clientX - _resizeDragData.startX) / z);
      const newH = Math.max(24, _resizeDragData.startModelH + (ev.clientY - _resizeDragData.startY) / z);
      _resizeNode.style({ width: newW, height: newH, padding: '0px' });
      _resizeNode.data('customW', newW); _resizeNode.data('customH', newH);
      updateResizeOverlayPosition();
    }
    function onUp() {
      _resizeDragData = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
})();


// ── Entity Renderer ────────────────────────────────────────────────────────────

/**
 * Renders a logical-data-model JSON as a mermaid erDiagram.
 * @param {HTMLElement} body - The container to render into.
 * @param {Object} data - Parsed LDM JSON.
 */
function renderApplication(body, data) {
  const app = data.application || data;
  let html = `<div class="doc-section">
    <h1>${escHtml(app.name || 'Application Definition')}</h1>
    <p>${escHtml(app.description || '')}</p>
    <table class="spec-table" style="margin-bottom:16px">
      <tbody>
        <tr><th>Type</th><td>${escHtml(app.type || '')}</td></tr>
        <tr><th>Domain</th><td>${escHtml(app.business_domain || '')}</td></tr>
        ${app.release_intent ? `<tr><th>Release Intent</th><td>${escHtml(app.release_intent)}</td></tr>` : ''}
      </tbody>
    </table>`;

  const actors = app.actors || [];
  if (actors.length) {
    html += `<h2>Actors</h2><div class="entity-card"><table class="spec-table"><thead>
      <tr><th>ID</th><th>Name</th><th>Description</th></tr></thead><tbody>`;
    actors.forEach(a => {
      html += `<tr><td><code>${escHtml(a.id)}</code></td><td><strong>${escHtml(a.name)}</strong></td><td>${escHtml(a.description || '')}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  const scope = app.scope || {};
  const inScope = scope.in_scope || [];
  const outScope = scope.out_of_scope_assumed || scope.out_of_scope || [];
  if (inScope.length || outScope.length) {
    html += `<h2>Scope</h2><div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">`;
    if (inScope.length) {
      html += `<div><h3 style="color:var(--accent)">In Scope</h3><ul>${inScope.map(s => `<li>${escHtml(s)}</li>`).join('')}</ul></div>`;
    }
    if (outScope.length) {
      html += `<div><h3 style="color:var(--muted)">Out of Scope</h3><ul>${outScope.map(s => `<li>${escHtml(s)}</li>`).join('')}</ul></div>`;
    }
    html += `</div>`;
  }

  const nfr = app.non_functional || {};
  const nfrEntries = Object.entries(nfr);
  if (nfrEntries.length) {
    html += `<h2>Non-Functional Requirements</h2><div class="entity-card"><table class="spec-table"><tbody>`;
    nfrEntries.forEach(([k, v]) => {
      html += `<tr><th style="text-transform:capitalize">${escHtml(k)}</th><td>${escHtml(String(v))}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  body.innerHTML = html;
}

function renderLogicalDataModel(body, data) {
  const CARD = {
    'one-to-many':  '||--o{',
    'many-to-one':  '}o--||',
    'one-to-one':   '||--||',
    'many-to-many': '}o--o{',
    'self-reference': '||--o{',
  };

  const entities = (data.entities || []).map(e => e.name);
  const rels = data.relationships_summary || [];

  const lines = ['erDiagram'];
  entities.forEach(name => lines.push(`    ${name} {}`));
  rels.forEach(r => {
    const arrow = CARD[r.cardinality] || CARD[r.type] || '||--o{';
    const label = (r.via || r.type || '').replace(/\s+/g, '_');
    lines.push(`    ${r.from} ${arrow} ${r.to} : "${label}"`);
  });

  const md = '```mermaid\n' + lines.join('\n') + '\n```';
  renderMarkdown(body, `# ${data.model || 'Logical Data Model'}\n\n${md}`, null);
}

/**
 * Renders an entity specification document (fields, relationships, rules,
 * state machine, events) into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {Object} d - Parsed entity JSON data.
 */
function renderEntity(body, raw) {
  const d = raw.entity ? { ...raw, ...raw.entity, entityName: raw.entity.name, entityId: raw.entity.id } : raw;
  let html = '';

  // Header
  const catClass = (d.category || '').replace(/\s+/g, '-');
  const MANAGED_LABELS = { system: 'System', ui: 'UI', external: 'External' };
  const SOURCE_LABELS  = { external: 'External', seed: 'Seed', 'user-generated': 'User Generated', 'data-conversion': 'Data Conversion' };
  const managedLabel = MANAGED_LABELS[d.managedBy] || d.managedBy || '';
  const sourceLabel  = SOURCE_LABELS[d.source]     || d.source     || '';
  const managedBadge = managedLabel
    ? `<span class="managed-badge ${escHtml(d.managedBy)}" title="Runtime ownership">${escHtml(managedLabel)}</span>` : '';
  const sourceBadge  = sourceLabel
    ? `<span class="source-badge ${escHtml(d.source)}" title="Data origin">${escHtml(sourceLabel)}</span>` : '';
  html += `<div class="ent-header">
    <div class="ent-top">
      <span class="ent-name">${escHtml(d.entityName)}</span>
      <span class="ent-id">${escHtml(d.entityId)}</span>
      <span class="cat-badge ${catClass}">${escHtml(d.category)}</span>
      ${managedBadge}${sourceBadge}
      <span class="ent-module">owned by ${modRefHtml(d.owningModule)}</span>
    </div>
    <div class="ent-desc">${escHtml(d.description || '')}</div>
  </div>`;

  // Relationships
  const rels = d.relationships || [];
  if (rels.length) {
    html += `<div class="spec-section"><h2>Relationships</h2>
      <div class="entity-card">
        <table class="rel-table"><tbody>`;
    rels.forEach(r => {
      const relTarget = r.entity || r.target || '';
      const relFk     = r.foreignKey || r.via || r.cardinality || '';
      html += `<tr>
        <td>${entRefHtml(relTarget)}</td>
        <td><span class="rel-type">${escHtml(r.type)}</span></td>
        <td><span class="rel-fk">${escHtml(relFk)}</span></td>
        <td style="font-size:12px;color:var(--muted)">${escHtml(r.description || '')}</td>
      </tr>`;
    });
    html += `</tbody></table></div></div>`;
  }

  // Fields / Attributes
  const fields = d.fields || d.attributes || [];
  if (fields.length) {
    html += `<div class="spec-section"><h2>Fields</h2>
      <div class="entity-card">
        <table class="spec-table">
          <thead><tr><th>Field</th><th>Type</th><th>Req</th><th>Constraints / Notes</th></tr></thead>
          <tbody>`;
    fields.forEach(f => {
      const constraints = (f.constraints || []).join(', ');
      const notes = [
        f.values ? `values: ${f.values.join(', ')}` : '',
        f.enum   ? `enum: ${f.enum.join(', ')}` : '',
        constraints,
        f.default !== undefined ? `default: ${f.default}` : '',
        f.note || f.description || '',
      ].filter(Boolean).join(' · ');
      const required = f.required !== undefined ? f.required : !(f.constraints || []).includes('NULLABLE');
      html += `<tr>
        <td><code>${escHtml(f.name)}</code></td>
        <td><code>${escHtml(f.type)}</code></td>
        <td><span class="req-dot ${required ? 'yes' : ''}" title="${required ? 'required' : 'optional'}"></span></td>
        <td style="font-size:12px;color:#6b7280">${escHtml(notes)}</td>
      </tr>`;
    });
    html += `</tbody></table></div></div>`;
  }

  // Rules
  const rules = d.rules || [];
  if (rules.length) {
    html += `<div class="spec-section"><h2>Entity Rules</h2>`;
    rules.forEach(r => {
      html += `<div class="rule-card">
        <span class="rule-id">${escHtml(r.id)}</span>
        <span class="rule-name">${escHtml(r.name)}</span>
        <div class="rule-cond"><span class="lbl">if</span><code>${escHtml(r.condition)}</code><span class="lbl" style="margin-left:10px">then</span> ${escHtml(r.action)}</div>
        ${r.elseAction ? `<div class="rule-cond" style="grid-column:1/-1"><span class="lbl">else</span> ${escHtml(r.elseAction)}</div>` : ''}
        ${r.trigger ? `<div class="rule-cond" style="grid-column:1/-1"><span class="lbl">trigger</span> ${escHtml(r.trigger)}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // State Machine
  const sm = d.stateMachine;
  if (sm && sm.states && sm.states.length) {
    html += `<div class="spec-section"><h2>State Machine</h2>
      <div class="sm-card">
        <div class="sm-states">
          <span class="lbl">States:</span>
          ${sm.states.map(s =>
            `<span class="state-pill${s === sm.initial ? ' initial' : ''}">${escHtml(s)}</span>`
          ).join('')}
          <span class="lbl" style="margin-left:8px">Initial:</span>
          <span style="font-weight:600;font-size:12px">${escHtml(sm.initial)}</span>
        </div>`;
    if ((sm.transitions || []).length) {
      html += `<table class="spec-table">
        <thead><tr><th>From</th><th>Event</th><th>To</th><th>Guard</th><th>Actions</th></tr></thead>
        <tbody>`;
      sm.transitions.forEach(t => {
        const from = Array.isArray(t.from) ? t.from.join(', ') : t.from;
        html += `<tr>
          <td><code>${escHtml(from)}</code></td>
          <td><code>${escHtml(t.event)}</code></td>
          <td><code>${escHtml(t.to)}</code></td>
          <td style="font-size:12px;color:#6b7280">${escHtml(t.guard || '-')}</td>
          <td style="font-size:12px;color:#374151">${escHtml((t.actions || []).join(', '))}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    } else {
      html += `<div style="padding:12px 16px;font-size:12.5px;color:var(--muted);font-style:italic">Terminal state - no transitions</div>`;
    }
    html += `</div></div>`;
  }

  // Events published
  const published = d.events?.published || [];
  if (published.length) {
    html += `<div class="spec-section"><h2>Events Published</h2>`;
    published.forEach(ev => {
      html += `<div class="event-row">
        <span class="event-name">${escHtml(ev.name)}</span>
        <span class="event-action" style="color:var(--muted);font-size:12px">${escHtml(ev.trigger || '')}</span>
        ${ev.schema ? `<span class="event-source" style="font-size:11.5px">${Object.keys(ev.schema).join(', ')}</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
}


// ── Module Spec Renderer ───────────────────────────────────────────────────────

/**
 * Renders a module specification document (implements, rules, state machine,
 * API endpoints, events) into the body element.
 * @param {HTMLElement} body - The container to render into.
 * @param {Object} d - Parsed module spec JSON data.
 */
function renderModuleSpec(body, d) {
  let html = '';

  // Header + Implements
  const impls = d.implements || [];
  const layerBadge = d.layer
    ? `<span class="layer-badge ${escHtml(d.layer)}">${escHtml(d.layer)}</span>` : '';
  html += `<div class="spec-header">
    <span class="mod-id">${escHtml(d.moduleId)}</span>
    <span class="mod-name">${escHtml(d.moduleName)}</span>
    ${layerBadge}
    <span class="mod-ver">v${escHtml(d.version)} &nbsp;&middot;&nbsp; ${escHtml(d.date)}</span>
  </div>`;
  if (impls.length) {
    html += `<div class="spec-section"><h2>Implements</h2>
      <div class="implements-row">${impls.map(id => entRefHtml(id)).join('')}</div>
    </div>`;
  }

  // Rules
  const rules = d.rules || [];
  if (rules.length) {
    html += `<div class="spec-section"><h2>Business Rules</h2>`;
    rules.forEach(r => {
      html += `<div class="rule-card">
        <span class="rule-id">${escHtml(r.id)}</span>
        <span class="rule-name">${escHtml(r.name)}</span>
        <div class="rule-cond"><span class="lbl">if</span><code>${escHtml(r.condition)}</code><span class="lbl" style="margin-left:10px">then</span> ${escHtml(r.action)}</div>
        ${r.elseAction ? `<div class="rule-cond" style="grid-column:1/-1"><span class="lbl">else</span> ${escHtml(r.elseAction)}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // State Machine
  const sm = d.stateMachine;
  if (sm) {
    html += `<div class="spec-section"><h2>State Machine - ${escHtml(sm.entity)}</h2>
      <div class="sm-card">
        <div class="sm-states">
          <span class="lbl">States:</span>
          ${(sm.states || []).map(s =>
            `<span class="state-pill${s === sm.initial ? ' initial' : ''}">${escHtml(s)}</span>`
          ).join('')}
          <span class="lbl" style="margin-left:8px">Initial:</span>
          <span style="font-weight:600;font-size:12px">${escHtml(sm.initial)}</span>
        </div>`;
    if ((sm.transitions || []).length) {
      html += `<table class="spec-table">
        <thead><tr><th>From</th><th>Event</th><th>To</th><th>Guard</th><th>Actions</th></tr></thead>
        <tbody>`;
      sm.transitions.forEach(t => {
        const from = Array.isArray(t.from) ? t.from.join(', ') : t.from;
        const actions = (t.actions || []).join(', ');
        html += `<tr>
          <td><code>${escHtml(from)}</code></td>
          <td><code>${escHtml(t.event)}</code></td>
          <td><code>${escHtml(t.to)}</code></td>
          <td style="font-size:12px;color:#6b7280">${escHtml(t.guard || '-')}</td>
          <td style="font-size:12px;color:#374151">${escHtml(actions)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    } else {
      html += `<div style="padding:12px 16px;font-size:12.5px;color:var(--muted);font-style:italic">No transitions (terminal state)</div>`;
    }
    html += `</div></div>`;
  }

  // API
  const endpoints = d.api?.endpoints || [];
  if (endpoints.length) {
    html += `<div class="spec-section"><h2>API &nbsp;<span style="font-size:12px;font-weight:400;color:var(--muted);letter-spacing:0">${escHtml(d.api.basePath)}</span></h2>`;
    endpoints.forEach(ep => {
      const fullPath = d.api.basePath + ep.path;
      html += `<div class="ep-card">
        <div class="ep-head">
          <span class="ep-method ${ep.method}">${escHtml(ep.method)}</span>
          <span class="ep-path">${escHtml(fullPath)}</span>
        </div>
        <div class="ep-desc">${escHtml(ep.description)}</div>
        ${(ep.errors || []).length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">
          Errors: ${ep.errors.map(e => `<code>${e.code}</code> ${escHtml(e.condition)}`).join(' &nbsp;&middot;&nbsp; ')}
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Events
  const published = d.events?.published || [];
  const consumed  = d.events?.consumed  || [];
  if (published.length || consumed.length) {
    html += `<div class="spec-section"><h2>Events</h2>`;
    if (published.length) {
      html += `<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Published</div>`;
      published.forEach(ev => {
        html += `<div class="event-row">
          <span class="event-name">${escHtml(ev.name)}</span>
          ${ev.schema ? `<span class="event-action" style="font-size:11.5px;color:var(--muted)">${Object.keys(ev.schema).join(', ')}</span>` : ''}
        </div>`;
      });
    }
    if (consumed.length) {
      html += `<div style="font-size:12px;font-weight:700;color:var(--muted);margin:14px 0 6px;text-transform:uppercase;letter-spacing:.4px">Consumed</div>`;
      consumed.forEach(ev => {
        html += `<div class="event-row">
          <span class="event-name">${escHtml(ev.name)}</span>
          <span class="event-action">${escHtml(ev.action || '')}</span>
          ${ev.source ? `<span class="event-source">${modRefHtml(ev.source)}</span>` : ''}
        </div>`;
      });
    }
    html += `</div>`;
  }

  body.innerHTML = html;
}


// ── Editor ─────────────────────────────────────────────────────────────────────

/**
 * Enters edit mode for the current document: hides the rendered body and shows
 * the editor textarea.
 */
function startEdit() {
  editing = true;
  document.getElementById('doc-body').style.display = 'none';
  const wrap = document.getElementById('editor-wrap');
  wrap.style.display = 'flex';
  const ta = document.getElementById('editor-textarea');
  ta.value = activeContent;
  document.getElementById('editor-preview').style.display = 'none';
  ta.style.display = 'block';
  setEditorTab('edit');
  setSaveStatus('');
  ta.focus();
}

/**
 * Cancels the current edit and returns to the rendered document view.
 */
function cancelEdit() {
  editing = false;
  showDocBody();
  setSaveStatus('');
}

/**
 * Hides the editor panel and shows the rendered document body.
 */
function showDocBody() {
  document.getElementById('editor-wrap').style.display = 'none';
  document.getElementById('doc-body').style.display = '';
}

/**
 * Switches the editor between the Edit and Preview tabs.
 * @param {'edit'|'preview'} tab - The tab to activate.
 */
function switchEditorTab(tab) {
  const ta = document.getElementById('editor-textarea');
  const preview = document.getElementById('editor-preview');
  setEditorTab(tab);
  if (tab === 'preview') {
    preview.innerHTML = marked.parse(ta.value);
    preview.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    ta.style.display = 'none';
    preview.style.display = 'block';
  } else {
    ta.style.display = 'block';
    preview.style.display = 'none';
    ta.focus();
  }
}

/**
 * Updates the active state of the editor toolbar tab buttons.
 * @param {'edit'|'preview'} active - The currently active tab name.
 */
function setEditorTab(active) {
  document.querySelectorAll('.editor-tab').forEach(b =>
    b.classList.toggle('active', b.textContent.trim().toLowerCase() === active)
  );
}

/**
 * Saves the current editor content to the server via PUT and re-renders the doc.
 */
async function saveDoc() {
  const content = document.getElementById('editor-textarea').value;
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  setSaveStatus('');
  try {
    const res = await fetch(`/api/doc/${encodeURIComponent(activeDoc.file)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(await res.text());
    activeContent = content;
    setSaveStatus('ok', 'Saved');
    // re-render the view with updated content
    await renderDoc(activeDoc, content, 'md');
    setTimeout(() => {
      editing = false;
      showDocBody();
      setSaveStatus('');
    }, 800);
  } catch (e) {
    setSaveStatus('err', 'Save failed: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

/**
 * Updates the save-status indicator in the editor toolbar.
 * @param {'ok'|'err'|''} type - Status type ('ok', 'err', or '' to hide).
 * @param {string} [msg=''] - The message text to display.
 */
function setSaveStatus(type, msg = '') {
  const el = document.getElementById('save-status');
  el.className = type ? `status ${type}` : '';
  el.textContent = msg;
  el.style.display = (type && msg) ? 'inline-block' : 'none';
  if (type) el.className = type; // matches CSS: .ok / .err
}


// ── New Document Modal ─────────────────────────────────────────────────────────
let _newDocType = '';

/**
 * Opens the new-document modal for the given document type.
 * @param {'use-case'|'entity'} type - The type of document to create.
 */
function promptNew(type) {
  _newDocType = type;
  document.getElementById('new-doc-title').textContent = type === 'entity' ? 'New Entity' : 'New Use Case';
  const hint = type === 'entity'
    ? 'Creates On-Boarding/entities/ent-{name}.json'
    : 'Creates On-Boarding/use-cases/uc-{name}.md';
  document.getElementById('new-doc-hint').textContent = hint;
  document.getElementById('new-doc-name').value = '';
  document.getElementById('new-doc-err').style.display = 'none';
  document.getElementById('new-doc-modal').classList.add('open');
  setTimeout(() => document.getElementById('new-doc-name').focus(), 50);
}

/**
 * Closes the new-document modal without creating a file.
 */
function closeNewModal() {
  document.getElementById('new-doc-modal').classList.remove('open');
}

/**
 * Submits the new-document form: validates the name, POSTs to /api/new,
 * refreshes the nav tree, and opens the newly created document.
 */
async function submitNew() {
  const name = document.getElementById('new-doc-name').value.trim().toLowerCase().replace(/\s+/g, '-');
  const errEl = document.getElementById('new-doc-err');
  if (!name || !/^[\w-]+$/.test(name)) {
    errEl.textContent = 'Use letters, numbers, and hyphens only.';
    errEl.style.display = 'block'; return;
  }
  try {
    const res = await fetch('/api/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: _newDocType, name }),
    });
    if (res.status === 409) {
      errEl.textContent = 'A file with that name already exists.';
      errEl.style.display = 'block'; return;
    }
    if (!res.ok) {
      errEl.textContent = 'Server error: ' + (await res.text());
      errEl.style.display = 'block'; return;
    }
    closeNewModal();
    // Reload tree so new file appears in nav, then open it
    tree = await fetchJson('/api/tree');
    buildDocLookups(tree);
    buildNav(tree);
    const newId = _newDocType === 'entity' ? `ent-${name}` : `uc-${name}`;
    const doc = findDocById(newId);
    if (doc) loadDoc(doc);
  } catch (e) {
    errEl.textContent = 'Network error: ' + e.message;
    errEl.style.display = 'block';
  }
}


// ── Boot ───────────────────────────────────────────────────────────────────────
window.addEventListener('error', (event) => {
  clientLog('error', 'Viewer runtime error', { error: event.error || event.message });
});
window.addEventListener('unhandledrejection', (event) => {
  clientLog('error', 'Viewer unhandled rejection', { reason: event.reason });
});

init();

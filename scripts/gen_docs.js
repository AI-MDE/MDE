/**
 * gen_docs.js
 *
 * Generates a self-contained documentation site as .md files from
 * metaModel/appStructure.json.
 *
 * All referenced source files are copied into output/docs/files/ so the
 * entire output folder is portable — no links point outside it.
 * Every href in the generated pages is relative to the file it appears in.
 *
 * Output layout:
 *   output/docs/
 *     index.md                  ← site index
 *     {section-id}.md           ← one page per catalog section
 *     files/
 *       ba/requirements.md      ← source files copied here verbatim
 *       ba/use-cases/uc-001.md
 *       design/...
 *       ...
 *
 * Usage:
 *   node mde/scripts/gen_docs.js
 *   node mde/scripts/gen_docs.js --out=output/docs
 *   node mde/scripts/gen_docs.js --dry-run
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT          = path.join(__dirname, '../..');
const APP_STRUCTURE = path.join(ROOT, 'metaModel/appStructure.json');
const DRY_RUN       = process.argv.includes('--dry-run');

const outArg  = process.argv.find(a => a.startsWith('--out='));
const OUT_DIR = outArg
  ? path.resolve(ROOT, outArg.slice(6))
  : path.join(ROOT, 'output/docs');

/** Files sub-folder inside OUT_DIR where all source copies live. */
const FILES_DIR = path.join(OUT_DIR, 'files');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Relative posix path from one absolute file to another. */
function relLink(fromFile, toFile) {
  return path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

/**
 * Destination path inside FILES_DIR for a source file.
 * srcRelative is the path as written in appStructure (e.g. "ba/requirements.md").
 */
function destFor(srcRelative) {
  return path.join(FILES_DIR, srcRelative);
}

/**
 * Copy srcAbsolute → destFor(srcRelative), creating directories as needed.
 * In dry-run mode only logs.
 * Returns the destination path (whether or not it was written).
 */
function copySourceFile(srcRelative, srcAbsolute) {
  const dest = destFor(srcRelative);
  const rel  = path.relative(ROOT, dest);
  if (DRY_RUN) {
    console.log(`[dry-run] copy → ${rel}`);
    return dest;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcAbsolute, dest);
  return dest;
}

/**
 * Scan a directory for files matching a regex pattern.
 * Returns objects { srcRelative, srcAbsolute }, sorted by name.
 */
function scanDir(dir, pattern, recursive) {
  const absDir = path.join(ROOT, dir);
  if (!fileExists(absDir)) return [];
  const re = new RegExp(pattern);
  const results = [];

  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory() && recursive) { walk(full); }
      else if (e.isFile() && re.test(e.name)) {
        results.push({
          srcAbsolute: full,
          srcRelative: path.relative(ROOT, full).replace(/\\/g, '/'),
        });
      }
    }
  }

  walk(absDir);
  return results.sort((a, b) => a.srcRelative.localeCompare(b.srcRelative));
}

/** Write a generated page, or log in dry-run mode. */
function writePage(filePath, content) {
  const rel = path.relative(ROOT, filePath);
  if (DRY_RUN) {
    console.log(`[dry-run] page → ${rel}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`OK   ${rel}`);
}

// ─── Page builders ────────────────────────────────────────────────────────────

/** Main index — lists all sections with link counts. */
function buildIndex(catalog, indexFile) {
  const date  = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Project Documentation',
    '',
    `> Generated ${date} from \`metaModel/appStructure.json\``,
    '',
    '## Sections',
    '',
    '| Section | Docs | Groups |',
    '|---|---|---|',
  ];

  for (const section of catalog) {
    const sectionFile = path.join(OUT_DIR, `${section.id}.md`);
    const href        = relLink(indexFile, sectionFile);
    const docCount    = (section.docs   || []).filter(d => d.file).length;
    const groupCount  = (section.groups || []).length;
    lines.push(`| [${section.label}](${href}) | ${docCount || '—'} | ${groupCount || '—'} |`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Render table rows for a static doc list.
 * Copies each present source file into FILES_DIR and links to the copy.
 */
function renderDocRows(docs, pageFile) {
  const rows = [];
  for (const doc of docs) {
    if (!doc.file) continue;
    const srcAbs  = path.join(ROOT, doc.file);
    const present = fileExists(srcAbs);
    const label   = doc.label || path.basename(doc.file);
    const req     = doc.required === true ? 'required' : doc.required === false ? 'optional' : '';
    const status  = present ? 'present' : (doc.required ? 'missing — required' : 'absent');

    let nameCell;
    if (present) {
      const dest = copySourceFile(doc.file, srcAbs);
      nameCell = `[${label}](${relLink(pageFile, dest)})`;
    } else {
      nameCell = label;
    }

    rows.push(`| ${nameCell} | \`${doc.file}\` | ${req} | ${status} |`);
  }
  return rows;
}

/** Build a full section page. */
function buildSectionPage(section, pageFile, indexFile) {
  const lines = [
    `# ${section.label}`,
    '',
    `[&larr; Back to index](${relLink(pageFile, indexFile)})`,
    '',
  ];

  // ── Direct docs ─────────────────────────────────────────────────────────────
  const docs = (section.docs || []).filter(d => d.file);
  if (docs.length) {
    lines.push('## Documents', '');
    lines.push('| Document | File | Required | Status |');
    lines.push('|---|---|---|---|');
    lines.push(...renderDocRows(docs, pageFile));
    lines.push('');
  }

  // ── Groups ──────────────────────────────────────────────────────────────────
  for (const group of (section.groups || [])) {
    lines.push(`## ${group.label}`, '');

    // Static doc list inside the group (e.g. meta/reference, meta/root)
    if (group.docs && group.docs.length) {
      lines.push('| Document | File | Status |');
      lines.push('|---|---|---|');
      for (const doc of group.docs) {
        if (!doc.file) continue;
        const srcAbs  = path.join(ROOT, doc.file);
        const present = fileExists(srcAbs);
        const label   = doc.label || path.basename(doc.file);
        const status  = present ? 'present' : 'absent';
        let cell;
        if (present) {
          const dest = copySourceFile(doc.file, srcAbs);
          cell = `[${label}](${relLink(pageFile, dest)})`;
        } else {
          cell = label;
        }
        lines.push(`| ${cell} | \`${doc.file}\` | ${status} |`);
      }
      lines.push('');
    }

    // Scanned directory group
    if (group.scan) {
      const { dir, pattern, recursive, kind } = group.scan;
      const found = scanDir(dir, pattern, recursive);

      if (found.length) {
        lines.push(`_Scanned \`${dir}\` — ${found.length} file(s)_`, '');
        lines.push('| File | Kind |');
        lines.push('|---|---|');
        for (const { srcRelative, srcAbsolute } of found) {
          const dest  = copySourceFile(srcRelative, srcAbsolute);
          const name  = path.relative(dir, srcRelative.replace(/\\/g, '/')).replace(/\\/g, '/');
          lines.push(`| [${name}](${relLink(pageFile, dest)}) | \`${kind || 'file'}\` |`);
        }
      } else {
        lines.push(`_No files found in \`${dir}\` matching \`${pattern}\`_`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  let appStructure;
  try {
    appStructure = JSON.parse(fs.readFileSync(APP_STRUCTURE, 'utf8'));
  } catch (err) {
    console.error(`ERR  reading appStructure.json: ${err.message}`);
    process.exit(1);
  }

  const { catalog } = appStructure;
  if (!Array.isArray(catalog) || catalog.length === 0) {
    console.error('ERR  appStructure.json has no catalog entries');
    process.exit(1);
  }

  const indexFile = path.join(OUT_DIR, 'index.md');

  writePage(indexFile, buildIndex(catalog, indexFile));

  let pageCount = 0;
  for (const section of catalog) {
    const pageFile = path.join(OUT_DIR, `${section.id}.md`);
    writePage(pageFile, buildSectionPage(section, pageFile, indexFile));
    pageCount++;
  }

  console.log('');
  console.log(`Done — ${pageCount} section pages + index → ${path.relative(ROOT, OUT_DIR)}`);
}

main();

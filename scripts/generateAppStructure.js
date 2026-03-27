/**
 * generateAppStructure.js
 *
 * Generates metaModel/appStructure.json from mde/methodology/methodology.json.
 *
 * The meta catalog entry (reference docs, root files) is defined as a static
 * template in this script — it is viewer-specific and does not belong in methodology.
 *
 * Usage:
 *   node mde/scripts/generateAppStructure.js
 *   node mde/scripts/generateAppStructure.js --dry-run
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '../..');
const METHODOLOGY = path.join(ROOT, 'mde/methodology/methodology.json');
const OUT         = path.join(ROOT, 'metaModel/appStructure.json');
const DRY_RUN     = process.argv.includes('--dry-run');

// ─── Static meta catalog entry (viewer-specific, not in methodology) ──────────

const META_ENTRY = {
  id: 'meta',
  label: 'Meta Model',
  docs: [],
  groups: [
    {
      id: 'reference',
      label: 'Reference',
      docs: [
        {
          id: 'methodology',
          label: 'Methodology',
          docType: 'reference',
          file: 'mde/methodology/methodology.json',
          includeIfExists: true,
        },
        {
          id: 'architecture-system',
          label: 'System Architecture Rules',
          docType: 'reference',
          file: 'mde/architecture/architecture.json',
          includeIfExists: true,
        },
        {
          id: 'orchestrator',
          label: 'Orchestrator',
          docType: 'orchestrator',
          file: 'mde/ai-instructions/orchestrator.json',
          includeIfExists: true,
        },
      ],
    },
    {
      id: 'root',
      label: 'Root',
      docs: [
        {
          id: 'root-configuration',
          label: 'Configuration',
          docType: 'root-configuration',
          file: 'configuration.json',
          includeIfExists: true,
        },
        {
          id: 'root-agent',
          label: 'AGENT',
          docType: 'file',
          file: 'AGENT.md',
          includeIfExists: true,
        },
      ],
    },
  ],
};

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildPatterns(methodology) {
  const patterns = {};
  const files = methodology.naming_conventions?.files || {};
  for (const [key, def] of Object.entries(files)) {
    // Use the key as-is, replacing underscores for readability
    patterns[key.replace(/_/g, '-')] = def.pattern;
  }
  return patterns;
}

function buildDoc(doc) {
  const entry = {
    id: doc.id,
    label: doc.label,
    docType: doc.docType,
    required: doc.required,
    includeIfExists: true,
  };
  if (doc.file) entry.file = doc.file;
  return entry;
}

function buildGroup(doc) {
  return {
    id: doc.id,
    label: doc.label,
    required: doc.required,
    scan: {
      ...doc.scan,
      kind: doc.docType,
    },
  };
}

function buildPhaseEntry(phase) {
  const entry = {
    id: phase.name,
    label: phase.label,
  };

  const docs  = (phase.docs || []).filter(d => d.file);
  const groups = (phase.docs || []).filter(d => d.scan);

  if (docs.length)   entry.docs   = docs.map(buildDoc);
  if (groups.length) entry.groups = groups.map(buildGroup);

  return entry;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  let methodology;
  try {
    methodology = JSON.parse(fs.readFileSync(METHODOLOGY, 'utf8'));
  } catch (err) {
    console.error(`ERR  reading methodology.json: ${err.message}`);
    process.exit(1);
  }

  const appStructure = {
    _generated: 'from mde/methodology/methodology.json — do not edit by hand',
    _generator: 'mde/scripts/generateAppStructure.js',
    patterns: buildPatterns(methodology),
    catalog: [
      META_ENTRY,
      ...(methodology.phases || []).map(buildPhaseEntry),
    ],
  };

  const output = JSON.stringify(appStructure, null, 2) + '\n';

  if (DRY_RUN) {
    console.log('[DRY RUN] Would write:', OUT);
    console.log(output);
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, output, 'utf8');
    console.log(`OK   metaModel/appStructure.json`);
    console.log(`     ${(methodology.phases || []).length} phases, ${
      (methodology.phases || []).reduce((n, p) => n + (p.docs || []).length, 0)
    } docs`);
  }
}

main();

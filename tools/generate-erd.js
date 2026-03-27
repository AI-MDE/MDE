#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');

function stripBom(value) {
  return typeof value === 'string' ? value.replace(/^\uFEFF/, '') : value;
}

function relCardinality(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('1-to-many')) return '||--o{';
  if (t.includes('many-to-1')) return '}o--||';
  if (t.includes('1-to-1')) return '||--||';
  if (t.includes('many-to-many')) return '}o--o{';
  return '||--o{';
}

function main() {
  const manager = ConfigurationManager.fromArgv(process.argv.slice(2), { defaultConfigPath: 'configuration.json' });
  const root = manager.getProjectRoot();
  const inPath = path.resolve(root, 'ba/data-model/logical-data-model.json');
  const outDir = path.resolve(root, 'output/docs/diagrams');
  const outPath = path.join(outDir, 'erd.md');

  if (!fs.existsSync(inPath)) {
    console.error(`[ERROR] Missing input: ${inPath}`);
    process.exit(1);
  }

  const ldm = JSON.parse(stripBom(fs.readFileSync(inPath, 'utf8')));
  const entities = Array.isArray(ldm.entities) ? ldm.entities : [];
  const rels = Array.isArray(ldm.relationships) ? ldm.relationships : [];

  const idByName = new Map();
  entities.forEach((e) => {
    const name = String(e.name || '').trim();
    if (name) idByName.set(name, name.replace(/[^A-Za-z0-9_]/g, '_'));
  });

  const lines = [];
  lines.push('# ERD');
  lines.push('');
  lines.push(`Source: \`${path.relative(root, inPath).replace(/\\/g, '/')}\``);
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');

  entities.forEach((e) => {
    const name = String(e.name || '').trim();
    if (!name) return;
    const entId = idByName.get(name) || name.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`  ${entId} {`);
    const attrs = Array.isArray(e.attributes) ? e.attributes : [];
    attrs.forEach((a) => lines.push(`    string ${String(a).replace(/[^A-Za-z0-9_]/g, '_')}`));
    lines.push('  }');
  });

  rels.forEach((r) => {
    const from = idByName.get(String(r.from || '').trim());
    const to = idByName.get(String(r.to || '').trim());
    if (!from || !to) return;
    const edge = relCardinality(r.type);
    const label = String(r.label || '').replace(/"/g, '\\"');
    lines.push(`  ${from} ${edge} ${to} : "${label}"`);
  });

  lines.push('```');
  lines.push('');

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`[OK] Wrote ${path.relative(root, outPath).replace(/\\/g, '/')}`);
}

main();

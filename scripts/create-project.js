#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const AI_MDE_DIR   = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(AI_MDE_DIR, 'app-template');
const TOKEN        = '{ai-mde-path}';

if (!process.argv[2]) {
  console.error('Usage: node scripts/create-project.js <target-directory>');
  process.exit(1);
}

const targetDir = path.resolve(process.argv[2]);

if (fs.existsSync(targetDir)) {
  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) {
    console.error(`Error: directory already exists and is not empty: ${targetDir}`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

if (!fs.existsSync(TEMPLATE_DIR)) {
  console.error(`Template directory not found: ${TEMPLATE_DIR}`);
  process.exit(1);
}

function copyAndReplace(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyAndReplace(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const raw = fs.readFileSync(src, 'utf8');
    const out = raw.split(TOKEN).join(AI_MDE_DIR.replace(/\\/g, '/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out, 'utf8');
    console.log(`  wrote: ${path.relative(targetDir, dest)}`);
  }
}

console.log(`Creating project in: ${targetDir}`);
console.log(`Replacing ${TOKEN} → ${AI_MDE_DIR.replace(/\\/g, '/')}\n`);
copyAndReplace(TEMPLATE_DIR, targetDir);
console.log('\nDone.');

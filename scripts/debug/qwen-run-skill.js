#!/usr/bin/env node
/**
 * Debug utility to run an AI-MDE folder against Ollama.
 *
 * Logic:
 * 1. Focus on a folder
 * 2. Invoke AI using Ollama API
 * 3. Attach inputs.zip content if it exists in the focused folder
 * 4. Prompt is ai-prompt.txt content in the focused folder
 * 5. Save request/response/output under a separate run/ folder
 *
 * Usage:
 *   node qwen-run-skill.js --folder=./work/item1 --model=qwen3-coder:latest
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { Agent } = require('undici');

function getArgValue(args, name, defaultValue) {
  const prefix = `${name}=`;
  const found = args.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function extractResponseText(json) {
  if (typeof json?.response === 'string') return json.response;
  if (typeof json?.output_text === 'string') return json.output_text;
  if (Array.isArray(json?.output)) {
    const chunks = [];
    for (const item of json.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const part of item.content) {
        if (typeof part?.text === 'string') chunks.push(part.text);
      }
    }
    if (chunks.length) return chunks.join('\n');
  }
  return '';
}

function isLikelyTextBuffer(buf) {
  const scanLength = Math.min(buf.length, 2048);
  for (let i = 0; i < scanLength; i += 1) {
    if (buf[i] === 0) return false;
  }
  return true;
}

function buildZipFilesSection(zipPath, maxTotalBytes, maxFileBytes) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter(e => !e.isDirectory);
  const sections = [];
  let usedBytes = 0;

  for (const entry of entries) {
    if (usedBytes >= maxTotalBytes) break;

    const raw = entry.getData();
    const remaining = Math.max(0, maxTotalBytes - usedBytes);
    const includedBytes = Math.min(raw.length, maxFileBytes, remaining);
    if (includedBytes <= 0) break;

    const clipped = raw.subarray(0, includedBytes);
    usedBytes += includedBytes;

    const isText = isLikelyTextBuffer(clipped);
    const content = isText ? clipped.toString('utf8') : clipped.toString('base64');
    const fenced = isText ? 'text' : 'base64';

    sections.push(
      [
        `FILE: ${entry.entryName}`,
        `ORIGINAL_SIZE_BYTES: ${raw.length}`,
        `INCLUDED_BYTES: ${includedBytes}`,
        `TRUNCATED: ${includedBytes < raw.length ? 'yes' : 'no'}`,
        `ENCODING: ${isText ? 'utf8' : 'base64'}`,
        `\`\`\`${fenced}`,
        content,
        '```'
      ].join('\n')
    );
  }

  return {
    fileCount: entries.length,
    emittedCount: sections.length,
    usedBytes,
    truncatedAtLimit: usedBytes >= maxTotalBytes,
    sectionText: sections.join('\n\n')
  };
}

async function main() {
  const args = process.argv.slice(2);
  const folderArg = getArgValue(args, '--folder', '.');
  const model = getArgValue(args, '--model', 'qwen3-coder:latest');
  const baseUrl = getArgValue(args, '--base-url', 'http://127.0.0.1:11434');
  const maxZipBytes = Number(getArgValue(args, '--max-zip-bytes', '200000'));
  const maxFileBytes = Number(getArgValue(args, '--max-file-bytes', '40000'));
  const timeoutMs = Number(getArgValue(args, '--timeout-ms', '600000'));

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    console.error(`Invalid --timeout-ms value: ${timeoutMs}`);
    process.exit(1);
  }
  if (!Number.isFinite(maxZipBytes) || maxZipBytes <= 0) {
    console.error(`Invalid --max-zip-bytes value: ${maxZipBytes}`);
    process.exit(1);
  }
  if (!Number.isFinite(maxFileBytes) || maxFileBytes <= 0) {
    console.error(`Invalid --max-file-bytes value: ${maxFileBytes}`);
    process.exit(1);
  }

  const focusFolder = path.resolve(folderArg);
  const promptFile = path.join(focusFolder, 'ai-prompt.txt');
  const zipFile = path.join(focusFolder, 'inputs.zip');
  const runDir = path.join(focusFolder, 'run');

  if (!fileExists(promptFile)) {
    console.error(`Missing required file: ${promptFile}`);
    process.exit(1);
  }

  ensureDir(runDir);

  const promptText = readTextFile(promptFile);

  let zipInfo = null;
  if (fileExists(zipFile)) {
    zipInfo = buildZipFilesSection(zipFile, maxZipBytes, maxFileBytes);
  }

  const assembledPrompt = [
    'You are executing an AI-MDE task against one focused folder.',
    '',
    `Focused folder: ${path.basename(focusFolder)}`,
    '',
    'Primary task instruction (from ai-prompt.txt):',
    '---',
    promptText.trim(),
    '---',
    '',
    zipInfo
      ? [
          'Evidence archive detected: inputs.zip',
          `Total files in zip: ${zipInfo.fileCount}`,
          `Files included in prompt: ${zipInfo.emittedCount}`,
          `Total included bytes budget (--max-zip-bytes): ${maxZipBytes}`,
          `Per-file byte cap (--max-file-bytes): ${maxFileBytes}`,
          `Bytes included from zip entries: ${zipInfo.usedBytes}`,
          `Truncated by total byte budget: ${zipInfo.truncatedAtLimit ? 'yes' : 'no'}`,
          '',
          'Attached files (path + content):',
          zipInfo.sectionText || '[No file content included due to byte limits]'
        ].join('\n')
      : 'No inputs.zip file was found.',
    '',
    'Return a practical result for this task. Be explicit about assumptions and missing information.'
  ].join('\n');

  const requestBody = {
    model,
    prompt: assembledPrompt,
    stream: false,
    keep_alive: '10m'
  };

  const stamp = timestamp();
  const requestPath = path.join(runDir, `${stamp}.request.json`);
  const responsePath = path.join(runDir, `${stamp}.response.json`);
  const outputPath = path.join(runDir, `${stamp}.output.txt`);

  fs.writeFileSync(requestPath, JSON.stringify(requestBody, null, 2), 'utf8');

  const dispatcher = new Agent({
    connectTimeout: 30_000,
    headersTimeout: timeoutMs,
    bodyTimeout: 0
  });

  let res;
  try {
    res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      dispatcher,
      signal: AbortSignal.timeout(timeoutMs + 30_000)
    });
  } finally {
    await dispatcher.close();
  }

  const rawText = await res.text();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = { raw: rawText };
  }

  fs.writeFileSync(responsePath, JSON.stringify(parsed, null, 2), 'utf8');

  if (!res.ok) {
    console.error(`Ollama request failed: ${res.status}`);
    console.error(rawText);
    process.exit(1);
  }

  const outputText = extractResponseText(parsed);
  fs.writeFileSync(outputPath, outputText, 'utf8');

  console.log(`Done.
Model: ${model}
Folder: ${focusFolder}
Request: ${requestPath}
Response: ${responsePath}
Output: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

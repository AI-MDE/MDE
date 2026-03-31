#!/usr/bin/env node
/**
 * 
 * This script is a debug utility to run an MDE skill via the OpenAI API. It constructs a prompt based on the skill contract and project files, sends it to the API, and saves the request and response for analysis.
 * 
 * Usage: 
 * 1. Focus on a folder:
 * 2. Invokes AI using API Call
 * 3. attache the inputs.zip file if exists in the focused folder as evidence
 * 4. prompt is the = `ai-prompt.txt` file content in the focused folder
 * 5. to this folder as a seperate folder run
 */

const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('../lib/config-manager');

function getArgValue(args, name) {
  const prefix = `${name}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function toRegexFromGlob(globPatternAbs) {
  const normalized = normalizeSlashes(globPatternAbs);
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexBody = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${regexBody}$`, 'i');
}

function walkFilesRecursive(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) results.push(abs);
    }
  }
  return results;
}

function resolveGlob(patternRel, baseDir) {
  const absPattern = path.resolve(baseDir, patternRel);
  const normalizedPattern = normalizeSlashes(absPattern);
  const hasWildcard = /[*?]/.test(normalizedPattern);
  if (!hasWildcard) {
    return fs.existsSync(absPattern) && fs.statSync(absPattern).isFile() ? [absPattern] : [];
  }

  const parts = normalizedPattern.split('/');
  const baseParts = [];
  for (const part of parts) {
    if (part.includes('*') || part.includes('?')) break;
    baseParts.push(part);
  }
  const basePath = baseParts.length > 0 ? baseParts.join('/') : normalizeSlashes(path.parse(normalizedPattern).root);
  const baseDirNative = basePath.replace(/\//g, path.sep);
  if (!fs.existsSync(baseDirNative)) return [];

  const regex = toRegexFromGlob(absPattern);
  return walkFilesRecursive(baseDirNative).filter((filePath) => regex.test(normalizeSlashes(filePath)));
}

function resolveSkillFiles(skill, skillFile, aiInstructionsDir, projectRoot) {
  const patterns = []
    .concat(Array.isArray(skill.inputs) ? skill.inputs : [])
    .concat(Array.isArray(skill.optional_inputs) ? skill.optional_inputs : []);
  const baseDirs = [path.dirname(skillFile), aiInstructionsDir, projectRoot];
  const found = new Set();
  const missingPatterns = [];

  patterns.forEach((patternRel) => {
    if (typeof patternRel !== 'string' || !patternRel.trim()) return;
    const matchSet = new Set();
    baseDirs.forEach((baseDir) => {
      resolveGlob(patternRel, baseDir).forEach((m) => matchSet.add(path.resolve(m)));
    });
    const matches = Array.from(matchSet);
    if (matches.length === 0) {
      missingPatterns.push(patternRel);
      return;
    }
    matches.forEach((m) => found.add(m));
  });

  return {
    declaredPatterns: patterns,
    files: Array.from(found).sort((a, b) => a.localeCompare(b)),
    missingPatterns,
  };
}

function readFileForPrompt(filePath, maxBytes) {
  const stat = fs.statSync(filePath);
  const isLarge = stat.size > maxBytes;
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    content: isLarge ? content.slice(0, maxBytes) : content,
    truncated: isLarge,
    size: stat.size,
  };
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string' && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  const texts = [];
  output.forEach((item) => {
    const content = Array.isArray(item.content) ? item.content : [];
    content.forEach((c) => {
      if (typeof c.text === 'string' && c.text.trim()) texts.push(c.text);
    });
  });
  return texts.join('\n\n').trim();
}

async function main() {
  const argv = process.argv.slice(2);
  const skillArg = getArgValue(argv, '--skill') || argv[0];
  if (!skillArg) {
    console.error('Usage: node mde/tools/run-skill-api.js --skill=<skill_name> [--model=gpt-5] [--config=configuration.json]');
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[ERROR] OPENAI_API_KEY is not set.');
    process.exit(1);
  }

  const model = getArgValue(argv, '--model') || 'gpt-5';
  const maxFileBytes = Number(getArgValue(argv, '--max-file-bytes') || 20000);
  const maxFiles = Number(getArgValue(argv, '--max-files') || 20);

  const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'configuration.json' });
  let cfg;
  try {
    cfg = manager.load();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }

  const projectRoot = manager.getProjectRoot();
  const aiInstructionsDir = path.join(projectRoot, 'mde', 'ai-instructions');
  const skillsDir = path.join(aiInstructionsDir, 'skills');
  const commandsDir = path.join(aiInstructionsDir, 'commands');
  const skillFile = path.join(skillsDir, `${skillArg}.json`);
  if (!fs.existsSync(skillFile)) {
    console.error(`[ERROR] Skill file not found: ${skillFile}`);
    process.exit(1);
  }

  const skill = safeJson(skillFile);
  if (!skill) {
    console.error(`[ERROR] Failed to parse skill JSON: ${skillFile}`);
    process.exit(1);
  }

  const resolved = resolveSkillFiles(skill, skillFile, aiInstructionsDir, projectRoot);
  const filesForPrompt = resolved.files.slice(0, maxFiles);

  const commandNames = fs.existsSync(commandsDir)
    ? fs.readdirSync(commandsDir)
        .filter((f) => /\.json$/i.test(f))
        .map((f) => safeJson(path.join(commandsDir, f)))
        .filter((x) => x && x.skill === skillArg && typeof x.name === 'string')
        .map((x) => x.name)
    : [];

  const promptPayload = {
    skill: {
      name: skillArg,
      purpose: skill.purpose || null,
      methodology: Array.isArray(skill.methodology) ? skill.methodology : [],
      rules: Array.isArray(skill.rules) ? skill.rules : [],
      constraints: Array.isArray(skill.constraints) ? skill.constraints : [],
      outputs: Array.isArray(skill.outputs) ? skill.outputs : [],
      commandMappings: commandNames,
    },
    project: {
      name: cfg && cfg['Project-Name'] ? cfg['Project-Name'] : null,
      root: projectRoot,
    },
    inputs: {
      declaredPatterns: resolved.declaredPatterns,
      missingPatterns: resolved.missingPatterns,
      files: filesForPrompt.map((abs) => {
        const rel = normalizeSlashes(path.relative(projectRoot, abs));
        const loaded = readFileForPrompt(abs, maxFileBytes);
        return {
          path: rel,
          size: loaded.size,
          truncated: loaded.truncated,
          content: loaded.content,
        };
      }),
    },
    task: 'Execute this skill and produce the expected outputs. Return concise findings and output drafts in a structured way.',
  };

  const systemText =
    'You are an MDE skill executor. Follow the provided skill contract strictly. ' +
    'Use only provided evidence, call out missing inputs, and return output drafts aligned to expected output paths.';

  const requestBody = {
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemText }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: JSON.stringify(promptPayload, null, 2) }],
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseTextRaw = await response.text();
  let responseJson = null;
  try {
    responseJson = JSON.parse(responseTextRaw);
  } catch {
    responseJson = { raw: responseTextRaw };
  }

  const debugDir = path.join(projectRoot, 'debug', skillArg, 'api-run');
  ensureDir(debugDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const requestPath = path.join(debugDir, `${stamp}.request.json`);
  const responsePath = path.join(debugDir, `${stamp}.response.json`);
  const textPath = path.join(debugDir, `${stamp}.output.txt`);

  fs.writeFileSync(requestPath, JSON.stringify(requestBody, null, 2) + '\n', 'utf8');
  fs.writeFileSync(responsePath, JSON.stringify(responseJson, null, 2) + '\n', 'utf8');
  const outputText = extractOutputText(responseJson) || '';
  fs.writeFileSync(textPath, outputText + '\n', 'utf8');

  if (!response.ok) {
    console.error(`[ERROR] API request failed (${response.status}).`);
    console.error(`Response: ${responseTextRaw}`);
    console.error(`Saved request: ${path.relative(projectRoot, requestPath)}`);
    console.error(`Saved response: ${path.relative(projectRoot, responsePath)}`);
    process.exit(1);
  }

  console.log(`Skill run completed for: ${skillArg}`);
  console.log(`Model: ${model}`);
  console.log(`Saved request: ${path.relative(projectRoot, requestPath)}`);
  console.log(`Saved response: ${path.relative(projectRoot, responsePath)}`);
  console.log(`Saved output text: ${path.relative(projectRoot, textPath)}`);
  console.log(`Included files: ${filesForPrompt.length}`);
  console.log(`Missing input patterns: ${resolved.missingPatterns.length}`);
}

main().catch((err) => {
  console.error(`[ERROR] ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});

#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

async function main() {
  const root = process.cwd();
  const envPath = path.join(root, '.env');
  loadDotEnv(envPath);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('[ERROR] OPENAI_API_KEY is missing.');
    process.exitCode = 1;
    return;
  }
  if (!key.startsWith('sk-')) {
    console.warn('[WARN] OPENAI_API_KEY does not start with sk- (verify key value).');
  }

  const model = process.argv.find((x) => x.startsWith('--model='))?.split('=')[1] || 'gpt-5';
  const body = {
    model,
    input: 'Health check. Reply with: ok',
    max_output_tokens: 16,
  };

  let statusCode = 0;
  let text = '';
  try {
    const payload = JSON.stringify(body);
    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        method: 'POST',
        hostname: 'api.openai.com',
        path: '/v1/responses',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${key}`,
        },
      }, (res) => {
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
      req.write(payload);
      req.end();
    });
    statusCode = response.statusCode;
    text = response.body;
  } catch (err) {
    console.error(`[ERROR] Network/API request failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  if (statusCode >= 200 && statusCode < 300) {
    console.log('[OK] API key is valid and request succeeded.');
    console.log(`Model: ${model}`);
    process.exitCode = 0;
    return;
  }

  const err = parsed && parsed.error ? parsed.error : null;
  const code = err && err.code ? err.code : `http_${statusCode}`;
  const message = err && err.message ? err.message : text;
  console.error(`[ERROR] API check failed: ${code}`);
  console.error(message);

  if (code === 'insufficient_quota') {
    console.error('');
    console.error('Likely cause: billing/quota issue on the account or project tied to this key.');
    console.error('Check: billing enabled, project budget/hard-limit, and key belongs to funded project.');
  } else if (statusCode === 401) {
    console.error('');
    console.error('Likely cause: invalid key or key not active yet.');
  } else if (statusCode === 429) {
    console.error('');
    console.error('Likely cause: rate limit exceeded for current tier.');
  }

  process.exitCode = 1;
}

main();

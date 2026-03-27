/**
 * CLI wrapper for viewer.js to run from a project directory.
 * Usage: node .\mde\web\app.js
 */
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const viewerPath = path.join(__dirname, 'viewer.js');
const projectRoot = process.cwd();
const viewerUrl = 'http://localhost:4000/';
const viewerPort = 4000;

const checkPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port }, () => {
      server.close(() => resolve(true));
    });
  });

const checkReady = (timeoutMs = 10000, intervalMs = 300) =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = () => {
      const req = http.get(viewerUrl, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }
        retryOrFail();
      });

      req.on('error', retryOrFail);
      req.setTimeout(1000, () => {
        req.destroy();
        retryOrFail();
      });
    };

    const retryOrFail = () => {
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`viewer did not become ready at ${viewerUrl} within ${timeoutMs}ms`));
        return;
      }
      setTimeout(attempt, intervalMs);
    };

    attempt();
  });

console.log(`[viewer] Starting server for project root: ${projectRoot}`);
console.log(`[viewer] Launching: ${viewerPath}`);

checkPortAvailable(viewerPort).then((available) => {
  if (!available) {
    console.error(`[viewer] Port ${viewerPort} is already in use. Stop the existing viewer/process and retry.`);
    process.exit(1);
  }

  const child = spawn(process.execPath, [viewerPath, `--root=${projectRoot}`], {
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error(`[viewer] Failed to launch: ${err.message}`);
    process.exit(1);
  });

  checkReady()
    .then(() => {
      console.log(`[viewer] Ready: ${viewerUrl}`);
      console.log('[viewer] Press Ctrl+C to stop.');
    })
    .catch((err) => {
      console.warn(`[viewer] Startup warning: ${err.message}`);
      console.warn('[viewer] If port 4000 is busy, stop the other process and retry.');
    });

  process.on('SIGINT', () => {
    if (!child.killed) child.kill('SIGINT');
  });

  child.on('exit', (code) => process.exit(code ?? 0));
});

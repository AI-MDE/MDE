import * as path from 'path';
import * as http from 'http';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/**
 * CLI wrapper for viewer.js to run from a project directory.
 * Usage: ts-node mde/web/app.ts --root=<project-root>
 */

const viewerPath: string = path.join(__dirname, 'viewer.ts');

const parseArg = (prefix: string): string | undefined =>
  process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length);

const rootArg: string | undefined = parseArg('--root=');
const projectRoot: string = rootArg ? path.resolve(rootArg) : process.cwd();
const viewerPort: number = parseInt(parseArg('--port=') ?? '4000', 10);
const viewerUrl: string = `http://localhost:${viewerPort}/`;

const checkPortAvailable = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port }, () => {
      server.close(() => resolve(true));
    });
  });

const checkReady = (timeoutMs: number = 10000, intervalMs: number = 300): Promise<void> =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = () => {
      const req = http.get(viewerUrl, (res: http.IncomingMessage) => {
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

  const child: ChildProcess = spawn(process.execPath, [viewerPath, `--root=${projectRoot}`], {
    stdio: 'inherit',
  });

  child.on('error', (err: Error) => {
    console.error(`[viewer] Failed to launch: ${err.message}`);
    process.exit(1);
  });

  checkReady()
    .then(() => {
      console.log(`[viewer] Ready: ${viewerUrl}`);
      console.log('[viewer] Press Ctrl+C to stop.');
    })
    .catch((err: Error) => {
      console.warn(`[viewer] Startup warning: ${err.message}`);
      console.warn('[viewer] If port 4000 is busy, stop the other process and retry.');
    });

  process.on('SIGINT', () => {
    if (!child.killed) child.kill('SIGINT');
  });

  child.on('exit', (code: number | null) => process.exit(code ?? 0));
});
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
/**
 * CLI wrapper for viewer.js to run from a project directory.
 * Usage:
 *   ts-node web/app.ts <project-root> <port>
 *   ts-node web/app.ts --root=<project-root> --port=<port>
 */
const viewerPath = path.join(__dirname, 'viewer.ts');
const argv = process.argv.slice(2);
const parseArg = (prefix) => { var _a; return (_a = argv.find(a => a.startsWith(prefix))) === null || _a === void 0 ? void 0 : _a.slice(prefix.length); };
const positionalArgs = argv.filter(a => !a.startsWith('--'));
const rootArg = positionalArgs[0] || parseArg('--root=');
const portArg = positionalArgs[1] || parseArg('--port=');
const projectRoot = rootArg ? path.resolve(rootArg) : process.cwd();
const viewerPort = parseInt(portArg || '4000', 10);
if (!Number.isFinite(viewerPort) || viewerPort <= 0) {
    console.error(`[viewer] Invalid port: ${portArg}`);
    process.exit(1);
}
const viewerUrl = `http://localhost:${viewerPort}/`;
const checkPortAvailable = (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port }, () => {
        server.close(() => resolve(true));
    });
});
const checkReady = (timeoutMs = 10000, intervalMs = 300) => new Promise((resolve, reject) => {
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
    const child = (0, child_process_1.spawn)(process.execPath, [viewerPath, `--root=${projectRoot}`, `--port=${viewerPort}`], {
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
        if (!child.killed)
            child.kill('SIGINT');
    });
    child.on('exit', (code) => process.exit(code ?? 0));
});

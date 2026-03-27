#!/usr/bin/env node
const path = require('path');

function getArgValue(args, name) {
  const prefix = `${name}=`;
  const item = args.find((x) => x.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  const configPath = getArgValue(argv, '--config') || 'configuration.json';
  const projectRoot = process.cwd();
  const resolvedConfig = path.resolve(projectRoot, configPath);

  console.log(`[INFO] Running {{COMMAND_NAME}}`);
  console.log(`[INFO] Project root: ${projectRoot}`);
  console.log(`[INFO] Config: ${resolvedConfig}`);

  // TODO: implement command behavior
  console.log('[WARN] Command not implemented yet.');
}

main();

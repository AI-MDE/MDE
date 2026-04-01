#!/usr/bin/env node
/**
 * Purpose: Validates configuration.json structure, required fields, and resolved path semantics. against the Configuration schema and resolution logic.
 * 
 */
const path = require('path');
const { ConfigurationManager } = require('../tools/lib/config-manager');

const argv = process.argv.slice(2);
const configArg =
  ConfigurationManager.getArgValue(argv, '--config')
  || argv.find((arg) => !arg.startsWith('--'))
  || 'sample/configuration.json';
const manager = new ConfigurationManager({ configArg, defaultConfigPath: 'sample/configuration.json' });

let result;
try {
  manager.load();
  result = manager.validate();
} catch (err) {
  console.error('ERROR: ' + (err.message || String(err)));
  process.exit(1);
}

result.errors.forEach((msg) => console.error('ERROR: ' + msg));
result.warnings.forEach((msg) => console.warn('WARN: ' + msg));

const summary = function() {
  console.log('');
  console.log('Validated ' + path.relative(process.cwd(), manager.getConfigPath()));
  console.log('  Errors  : ' + result.errors.length);
  console.log('  Warnings: ' + result.warnings.length);
  if (result.errors.length > 0) {
    console.log('');
    console.log('Fix the above errors and re-run the validator.');
  }
};

summary();

process.exit(result.errors.length ? 1 : 0);


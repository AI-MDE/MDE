#!/usr/bin/env node
/**
 * Legacy compatibility entry point for project initialization.
 *
 * Preferred command:
 *   node mde/tools/init-app.js --config=configuration.json [--dry-run]
 *
 * Backward-compatible command:
 *   node mde/tools/initiate_project.js --config=configuration.json [--dry-run]
 *
 * Notes:
 * - This script intentionally delegates all logic to init-app.js.
 * - Keeping this wrapper avoids breaking existing command bindings and docs
 *   that still reference "initiate_project".
 */
require('./init-app');

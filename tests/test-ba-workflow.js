'use strict';

const fs = require('fs');
const path = require('path');

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPathExists(root, relPath, label) {
  const fullPath = path.resolve(root, relPath);
  assertTrue(fs.existsSync(fullPath), `${label} is missing: ${relPath}`);
}

function readJsonFile(root, relPath) {
  const fullPath = path.resolve(root, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function main() {
  const root = path.resolve(__dirname, '..');

  const requiredPaths = [
    { path: 'AGENT.md', label: 'Agent bootstrap' },
    { path: 'mde/ai-instructions/commands', label: 'Command source folder' },
    { path: 'mde/ai-instructions/skills', label: 'Skill source folder' },
    { path: 'mde/ai-instructions/orchestrator.json', label: 'Orchestrator file' },
    { path: 'ba', label: 'BA folder' },
    { path: 'ba/requirements.md', label: 'Requirements baseline' },
    { path: 'ba/analysis-status.md', label: 'BA status document' },
    { path: 'ba/discovery', label: 'Discovery folder' },
    { path: 'ba/analyzed', label: 'Analyzed folder' },
    { path: 'application', label: 'Application folder' },
    { path: 'project', label: 'Project folder' },
    { path: 'application/application.json', label: 'Application definition' },
    { path: 'project/questions.json', label: 'Active question batch' },
    { path: 'project/open-queue.json', label: 'Open queue' },
    { path: 'project/completed-Questions.json', label: 'Completed question archive' },
  ];

  for (const item of requiredPaths) {
    assertPathExists(root, item.path, item.label);
  }

  const orchestrator = readJsonFile(root, 'mde/ai-instructions/orchestrator.json');
  const performBa = readJsonFile(root, 'mde/ai-instructions/commands/perform_business_analysis.json');
  assertTrue(Boolean(performBa && performBa.name === 'perform_business_analysis'), 'perform_business_analysis command is missing');

  assertTrue(performBa.input.source_folder === '../../ba/discovery', 'perform_business_analysis source_folder must be ../../ba/discovery');
  assertTrue(performBa.input.application_definition === '../../application/application.json', 'perform_business_analysis application_definition must be ../../application/application.json');
  assertTrue(performBa.output.question_batch_file === '../../project/questions.json', 'perform_business_analysis question_batch_file must be ../../project/questions.json');
  assertTrue(performBa.output.queue_file === '../../project/open-queue.json', 'perform_business_analysis queue_file must be ../../project/open-queue.json');
  assertTrue(performBa.output.ba_doc_file === '../../ba/requirements.md', 'perform_business_analysis ba_doc_file must be ../../ba/requirements.md');
  assertTrue(performBa.output.status_doc_file === '../../ba/analysis-status.md', 'perform_business_analysis status_doc_file must be ../../ba/analysis-status.md');

  assertTrue(orchestrator.inputs.command_registry === 'mde/ai-instructions/commands', 'orchestrator command_registry must be mde/ai-instructions/commands');
  assertTrue(orchestrator.inputs.skills_registry === 'mde/ai-instructions/skills', 'orchestrator skills_registry must be mde/ai-instructions/skills');
  assertTrue(orchestrator.inputs.discovery_folder === '../../ba/discovery', 'orchestrator discovery_folder must be ../../ba/discovery');
  assertTrue(orchestrator.inputs.active_question_batch === '../../project/questions.json', 'orchestrator active_question_batch must be ../../project/questions.json');
  assertTrue(orchestrator.inputs.open_queue === '../../project/open-queue.json', 'orchestrator open_queue must be ../../project/open-queue.json');
  assertTrue(orchestrator.inputs.completed_questions === '../../project/completed-Questions.json', 'orchestrator completed_questions must be ../../project/completed-Questions.json');
  assertTrue(orchestrator.inputs.application_definition === '../../application/application.json', 'orchestrator application_definition must be ../../application/application.json');
  assertTrue(orchestrator.inputs.configuration === '../../configuration.json', 'orchestrator configuration must be ../../configuration.json');
  assertTrue(orchestrator.inputs.requirements_baseline === '../../ba/requirements.md', 'orchestrator requirements_baseline must be ../../ba/requirements.md');
  assertTrue(orchestrator.inputs.analysis_status === '../../ba/analysis-status.md', 'orchestrator analysis_status must be ../../ba/analysis-status.md');

  const baPhase = orchestrator.phase_rules.business_analysis;
  assertTrue(asArray(baPhase.allowed_commands).includes('perform_business_analysis'), 'business_analysis phase must allow perform_business_analysis');

  const agentText = fs.readFileSync(path.resolve(root, 'AGENT.md'), 'utf8');
  const requiredAgentMentions = [
    'mde/ai-instructions/orchestrator.json',
    'mde/ai-instructions/commands/',
    'mde/ai-instructions/skills/',
    'mde/scripts/merge-mde.ps1',
    'ba/requirements.md',
    'ba/analysis-status.md',
    'ba/discovery/',
    'ba/analyzed/',
    'application/application.json',
    'project/questions.json',
    'project/open-queue.json',
    'project/completed-Questions.json',
  ];
  for (const mention of requiredAgentMentions) {
    assertTrue(agentText.includes(mention), `AGENT.md is missing reference: ${mention}`);
  }

  const questions = readJsonFile(root, 'project/questions.json');
  const queue = readJsonFile(root, 'project/open-queue.json');
  const completed = readJsonFile(root, 'project/completed-Questions.json');
  const commandSources = fs.readdirSync(path.resolve(root, 'mde/ai-instructions/commands')).filter((f) => f.endsWith('.json'));
  const skillSources = fs.readdirSync(path.resolve(root, 'mde/ai-instructions/skills')).filter((f) => f.endsWith('.json'));

  assertTrue(commandSources.length > 0, 'mde/ai-instructions/commands must contain at least one source file');
  assertTrue(skillSources.length > 0, 'mde/ai-instructions/skills must contain at least one source file');

  assertTrue(Array.isArray(questions), 'project/questions.json must be a JSON array');
  assertTrue(Array.isArray(queue), 'project/open-queue.json must be a JSON array');
  assertTrue(Array.isArray(completed), 'project/completed-Questions.json must be a JSON array');

  for (const question of questions) {
    assertTrue(typeof question.id === 'string' && question.id.length > 0, 'Each question must have an id');
    assertTrue(Object.prototype.hasOwnProperty.call(question, 'response'), `Question ${question.id} must include a response field`);
    for (const sourceRef of asArray(question.source_refs)) {
      assertTrue(!sourceRef.startsWith('BA/questions.json'), `Question ${question.id} has stale BA/questions.json reference`);
      assertTrue(!sourceRef.startsWith('ba/questions.json'), `Question ${question.id} has stale ba/questions.json reference`);
      assertTrue(!sourceRef.startsWith('output/questions.json'), `Question ${question.id} has stale output/questions.json reference`);
    }
  }

  for (const item of queue) {
    assertTrue(typeof item.id === 'string' && item.id.length > 0, 'Each open queue item must have an id');
    for (const sourceRef of asArray(item.source_refs)) {
      assertTrue(!sourceRef.startsWith('BA/open-queue.json'), `Queue item ${item.id} has stale BA/open-queue.json reference`);
      assertTrue(!sourceRef.startsWith('ba/open-queue.json'), `Queue item ${item.id} has stale ba/open-queue.json reference`);
      assertTrue(!sourceRef.startsWith('output/open-queue.json'), `Queue item ${item.id} has stale output/open-queue.json reference`);
      assertTrue(!sourceRef.startsWith('BA/questions.json'), `Queue item ${item.id} has stale BA/questions.json reference`);
      assertTrue(!sourceRef.startsWith('ba/questions.json'), `Queue item ${item.id} has stale ba/questions.json reference`);
      assertTrue(!sourceRef.startsWith('output/questions.json'), `Queue item ${item.id} has stale output/questions.json reference`);
    }
  }

  const statusText = fs.readFileSync(path.resolve(root, 'ba/analysis-status.md'), 'utf8');
  assertTrue(statusText.includes('../../project/questions.json'), 'analysis-status.md must reference ../../project/questions.json');
  assertTrue(statusText.includes('../../project/open-queue.json'), 'analysis-status.md must reference ../../project/open-queue.json');

  console.log('BA workflow smoke test passed.');
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}


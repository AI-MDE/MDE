/**
 * syncAIInstrToDocs.js
 *
 * Generates markdown documentation from AI instruction JSON sources:
 *   mde/ai-instructions/skills/*.json      → mde/docs/ai-instructions/skills/*.md
 *   mde/ai-instructions/commands/*.json    → mde/docs/ai-instructions/commands/*.md
 *   mde/ai-instructions/orchestrator.json  → mde/docs/ai-instructions/orchestrator.md
 *   mde/ai-instructions/orchestrator.json  → mde/docs/lifecycle.md
 *   mde/methodology/methodology.json       → mde/docs/methodology.md
 *
 * Usage:
 *   node mde/scripts/syncAIInstrToDocs.js
 *   node mde/scripts/syncAIInstrToDocs.js --dry-run
 *   node mde/scripts/syncAIInstrToDocs.js --only=skills|commands|orchestrator|lifecycle|methodology
 */

const fs      = require('fs');
const path    = require('path');

const AI_DIR       = path.join(__dirname, '../ai-instructions');
const DOCS_AI      = path.join(__dirname, '../docs/ai-instructions');
const METHODOLOGY  = path.join(__dirname, '../methodology/methodology.json');
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY    = (process.argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '') || 'all';

// ─── Markdown helpers ────────────────────────────────────────────────────────

const h1 = t  => `# ${t}\n`;
const h2 = t  => `\n## ${t}\n`;
const h3 = t  => `\n### ${t}\n`;
const hr = () => '\n---\n';

function bullet(items) {
  return items.map(i => `- ${i}`).join('\n') + '\n';
}

function kvTable(rows) {
  const lines = ['| Field | Value |', '|-------|-------|'];
  for (const [k, v] of rows) lines.push(`| \`${k}\` | ${v} |`);
  return lines.join('\n') + '\n';
}

function twoColTable(h1t, h2t, rows) {
  if (!rows.length) return '';
  const w1 = Math.max(h1t.length, ...rows.map(r => r[0].length));
  const w2 = Math.max(h2t.length, ...rows.map(r => r[1].length));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
  return [
    `| ${pad(h1t, w1)} | ${pad(h2t, w2)} |`,
    `|${'-'.repeat(w1 + 2)}|${'-'.repeat(w2 + 2)}|`,
    ...rows.map(([a, b]) => `| ${pad(a, w1)} | ${pad(b, w2)} |`),
  ].join('\n') + '\n';
}

// ─── Shared field renderers ───────────────────────────────────────────────────

function renderMeta(obj, extraFields = []) {
  const meta = [];
  if (obj.name)       meta.push(['name',       `\`${obj.name}\``]);
  if (obj.category)   meta.push(['category',   obj.category]);
  if (obj.phase)      meta.push(['phase',       obj.phase]);
  if (obj.intent)     meta.push(['intent',      obj.intent]);
  if (obj.ai)         meta.push(['ai',          `\`${obj.ai}\``]);
  if (obj.next_phase) meta.push(['next_phase',  obj.next_phase]);
  for (const [k, v] of extraFields) meta.push([k, v]);
  return meta.length ? '\n' + kvTable(meta) : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderSkill(s) {
  const parts = [];

  parts.push(h1(s.label || s.name) + renderMeta(s));
  parts.push(hr());

  if (s.purpose)
    parts.push(h2('Purpose') + '\n' + s.purpose + '\n');

  if (s.when_to_use?.length)
    parts.push(h2('When to Use') + '\n' + bullet(s.when_to_use));

  // Inputs
  {
    let inp = '';
    if (Array.isArray(s.inputs) && s.inputs.length)
      inp += h2('Inputs') + '\n' + bullet(s.inputs);
    if (s.input_types && Object.keys(s.input_types).length) {
      const rows = Object.entries(s.input_types).map(([k, d]) => {
        const req  = d.required ? '**required**' : 'optional';
        const mult = d.multiple ? ', multiple' : '';
        return [`\`${k}\``, `${req}${mult} — ${d.description}`];
      });
      inp += h2('Input Types') + '\n' + twoColTable('Input', 'Details', rows);
    }
    if (s.requires?.length)        inp += h3('Required') + '\n' + bullet(s.requires);
    if (s.optional_inputs?.length) inp += h3('Optional') + '\n' + bullet(s.optional_inputs);
    if (inp) parts.push(inp);
  }

  // Outputs
  if (s.outputs?.length) {
    let out = h2('Outputs') + '\n';
    if (s.output_formats) {
      const rows = s.outputs.map(o => [`\`${o}\``, s.output_formats[o] || '—']);
      out += twoColTable('Output', 'Format', rows);
    } else {
      out += bullet(s.outputs);
    }
    parts.push(out);
  }

  if (s.objectives?.length)
    parts.push(h2('Objectives') + '\n' + bullet(s.objectives));

  if (s.methodology?.length)
    parts.push(h2('Methodology') + '\n' + bullet(s.methodology));

  if (s.rules?.length)
    parts.push(h2('Rules') + '\n' + bullet(s.rules));

  if (s.constraints?.length)
    parts.push(h2('Constraints') + '\n' + bullet(s.constraints));

  if (s.uses_tools?.length)
    parts.push(h2('Tools Used') + '\n' + bullet(s.uses_tools));

  // Question strategy
  if (s.question_strategy) {
    const qs = s.question_strategy;
    let q = h2('Question Strategy') + '\n';
    q += `- Batch size: ${qs.batch_size_min}–${qs.batch_size_max} (default ${qs.batch_size_default})\n`;
    if (qs.prioritization?.length)      q += h3('Prioritization') + '\n' + bullet(qs.prioritization);
    if (qs.question_categories?.length) q += h3('Categories')     + '\n' + bullet(qs.question_categories);
    if (qs.answer_modes?.length)        q += h3('Answer Modes')   + '\n' + bullet(qs.answer_modes);
    parts.push(q);
  }

  // Default response policy
  if (s.default_response_policy) {
    const drp = s.default_response_policy;
    let d = h2('Default Response Policy') + '\n';
    d += `- Enabled: ${drp.enabled}\n`;
    d += `- Minimum confidence: ${drp.only_when_confidence_at_least}\n`;
    d += `- Max prefilled items: ${drp.max_prefilled_items}\n`;
    if (drp.rules?.length) d += h3('Rules') + '\n' + bullet(drp.rules);
    parts.push(d);
  }

  // Gap detection
  if (s.gap_detection) {
    const gd = s.gap_detection;
    let g = h2('Gap Detection') + '\n';
    if (gd.coverage_areas?.length) g += h3('Coverage Areas') + '\n' + bullet(gd.coverage_areas);
    const handlers = [
      gd.on_missing_required_context && `Missing required context → \`${gd.on_missing_required_context}\``,
      gd.on_conflict                 && `Conflict → \`${gd.on_conflict}\``,
      gd.on_partial_information      && `Partial information → \`${gd.on_partial_information}\``,
    ].filter(Boolean);
    if (handlers.length) g += h3('Handlers') + '\n' + bullet(handlers);
    parts.push(g);
  }

  if (s.traceability_rules?.length)
    parts.push(h2('Traceability Rules') + '\n' + bullet(s.traceability_rules));

  if (s.completion_criteria?.length)
    parts.push(h2('Completion Criteria') + '\n' + bullet(s.completion_criteria));

  if (s.failure_behavior) {
    const rows = Object.entries(s.failure_behavior).map(([k, v]) => [`\`${k}\``, `\`${v}\``]);
    parts.push(h2('Failure Behavior') + '\n' + twoColTable('Condition', 'Action', rows));
  }

  return parts.filter(Boolean).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderCommand(c) {
  const parts = [];

  parts.push(h1(c.label || c.name) + renderMeta(c, c.skill ? [['skill', `\`${c.skill}\``]] : []));
  parts.push(hr());

  // Skill / calls
  if (c.skill)
    parts.push(h2('Skill') + '\n' + `Delegates to skill: \`${c.skill}\`\n`);
  else if (c.calls?.length)
    parts.push(h2('Calls') + '\n' + bullet(c.calls));

  // Input paths (AI-required style: key → path object)
  if (c.input && Object.keys(c.input).length) {
    const rows = Object.entries(c.input).map(([k, v]) => [`\`${k}\``, `\`${v}\``]);
    parts.push(h2('Inputs') + '\n' + twoColTable('Key', 'Path', rows));
  }

  // Output paths (AI-required style: key → path object)
  if (c.output && Object.keys(c.output).length) {
    const rows = Object.entries(c.output).map(([k, v]) => [`\`${k}\``, `\`${v}\``]);
    parts.push(h2('Outputs') + '\n' + twoColTable('Key', 'Path', rows));
  }

  // Requires / produces (tool-executed style: arrays)
  if (c.requires?.length)
    parts.push(h2('Requires') + '\n' + bullet(c.requires));

  if (c.produces?.length)
    parts.push(h2('Produces') + '\n' + bullet(c.produces));

  if (c.tools?.length)
    parts.push(h2('Tools') + '\n' + bullet(c.tools));

  if (c.rules?.length)
    parts.push(h2('Rules') + '\n' + bullet(c.rules));

  return parts.filter(Boolean).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderOrchestrator(o) {
  const parts = [];

  parts.push(h1('Orchestrator Reference'));
  parts.push(kvTable([
    ['file',        '`mde/ai-instructions/orchestrator.json`'],
    ['name',        `\`${o.name}\``],
    ['version',     o.version],
    ['description', o.description],
  ]));

  parts.push(hr());

  // Significance — static explanatory section
  parts.push(
    h2('Significance and AI Adherence') +
    '\n' +
    '`orchestrator.json` is not executable code. There is no runtime engine that parses and enforces it. ' +
    'It is a structured instruction document designed to be read by an AI model and used to govern the AI\'s own behavior during a session.\n' +
    '\n' +
    'The chain is:\n' +
    '\n' +
    '1. `CLAUDE.md` (or `AGENT.md`) is auto-loaded at session start — it tells the AI to read `orchestrator.json` and the command/skill registries as the source of truth.\n' +
    '2. The AI reads the orchestrator into its context window.\n' +
    '3. From that point forward, the AI self-governs according to those rules.\n' +
    '\n' +
    'A capable model will generally respect the phase rules, execution pipeline, and response contract, ' +
    'but there is no enforcement mechanism. Adherence depends entirely on the model\'s instruction-following fidelity. ' +
    'This is also the file to edit when AI behavior needs to change.\n'
  );

  parts.push(hr());

  // Inputs table
  if (o.inputs) {
    const rows = Object.entries(o.inputs).map(([k, v]) => [`\`${k}\``, `\`${v}\``]);
    parts.push(h2('Inputs') + '\n' + twoColTable('Key', 'Path', rows));
  }

  // State model
  if (o.state_model) {
    let sm = h2('State Model') + '\n';
    sm += `State is persisted to \`${o.state_model.project_state_file}\`.\n`;
    if (o.state_model.fields) {
      const rows = Object.entries(o.state_model.fields).map(([k, v]) => {
        const type = Array.isArray(v) ? `${v[0]}[]` : (typeof v === 'object' ? JSON.stringify(v.type || v) : v);
        return [`\`${k}\``, type];
      });
      sm += '\n' + twoColTable('Field', 'Type', rows);
    }
    parts.push(sm);
  }

  // Command resolution
  if (o.command_resolution) {
    const cr = o.command_resolution;
    let c = h2('Command Resolution') + '\n';
    c += `**Mode:** \`${cr.mode}\`\n`;
    if (cr.rules?.length)    c += h3('Rules')    + '\n' + bullet(cr.rules);
    if (cr.examples?.length) {
      const rows = cr.examples.map(e => [`${e.user_input}`, `\`${e.resolved_command}\``]);
      c += h3('Examples') + '\n' + twoColTable('User Input', 'Resolved Command', rows);
    }
    parts.push(c);
  }

  // Execution pipeline
  if (o.execution_pipeline?.length) {
    const rows = o.execution_pipeline.map(s => [`${s.step}. \`${s.name}\``, s.description]);
    parts.push(h2('Execution Pipeline') + '\n' + twoColTable('Step', 'Description', rows));
  }

  // Phase rules
  if (o.phase_rules) {
    let pr = h2('Phase Rules') + '\n';
    for (const [phase, def] of Object.entries(o.phase_rules)) {
      pr += h3(phase);
      if (def.allowed_commands?.length) pr += `**Allowed:** ${def.allowed_commands.map(c => `\`${c}\``).join(', ')}\n\n`;
      if (def.entry_conditions?.length) pr += `**Entry conditions:**\n${bullet(def.entry_conditions)}`;
      else                              pr += `**Entry conditions:** _(none)_\n\n`;
      if (def.exit_conditions?.length)  pr += `**Exit conditions:**\n${bullet(def.exit_conditions)}`;
      else                              pr += `**Exit conditions:** _(none)_\n\n`;
    }
    parts.push(pr);
  }

  // Policies
  if (o.skill_invocation_policy?.rules?.length)
    parts.push(h2('Skill Invocation Policy') + '\n' + bullet(o.skill_invocation_policy.rules));

  if (o.tool_invocation_policy?.rules?.length)
    parts.push(h2('Tool Invocation Policy') + '\n' + bullet(o.tool_invocation_policy.rules));

  // Error handling
  if (o.error_handling) {
    const rows = Object.entries(o.error_handling).map(([k, v]) => [
      `\`${k}\``,
      `**${v.action}** — ${v.response}`,
    ]);
    parts.push(h2('Error Handling') + '\n' + twoColTable('Condition', 'Action & Response', rows));
  }

  // Response contract
  if (o.response_contract) {
    let rc = h2('Response Contract') + '\n';
    if (o.response_contract.fields?.length)
      rc += h3('Required Fields') + '\n' + bullet(o.response_contract.fields);
    if (o.response_contract.status_values?.length)
      rc += h3('Status Values') + '\n' + bullet(o.response_contract.status_values);
    parts.push(rc);
  }

  // Next command policy
  if (o.next_command_policy?.rules?.length)
    parts.push(h2('Next Command Policy') + '\n' + bullet(o.next_command_policy.rules));

  // Sample flows
  if (o.sample_flows?.length) {
    let sf = h2('Sample Flows') + '\n';
    for (const flow of o.sample_flows) {
      sf += h3(flow.user_input);
      sf += `- **Command:** \`${flow.resolved_command}\`\n`;
      if (flow.skills?.length) sf += `- **Skills:** ${flow.skills.map(s => `\`${s}\``).join(', ')}\n`;
      if (flow.tools?.length)  sf += `- **Tools:** ${flow.tools.map(t => `\`${t}\``).join(', ')}\n`;
      if (flow.outputs?.length) sf += `- **Outputs:**\n${bullet(flow.outputs)}`;
    }
    parts.push(sf);
  }

  return parts.filter(Boolean).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_NUMERALS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨'];
const PHASE_STYLES = [
  'fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f',
  'fill:#dcfce7,stroke:#22c55e,color:#14532d',
  'fill:#fef9c3,stroke:#eab308,color:#713f12',
  'fill:#ffedd5,stroke:#f97316,color:#7c2d12',
  'fill:#fce7f3,stroke:#ec4899,color:#831843',
  'fill:#ede9fe,stroke:#8b5cf6,color:#3b0764',
  'fill:#fee2e2,stroke:#ef4444,color:#7f1d1d',
];

function renderLifecycle(o) {
  const phaseRules = o.phase_rules || {};
  const phases     = Object.entries(phaseRules).filter(([k]) => k !== 'governance');
  const gov        = phaseRules['governance'] || {};
  const govCmds    = (gov.allowed_commands || []).join('  ·  ');

  // ── Mermaid diagram ──────────────────────────────────────────────────────────
  const phaseIds = phases.map((_, i) => `P${i}`);

  let diagram = '```mermaid\nflowchart TD\n\n';

  // Governance box
  diagram += `    subgraph GOV["⟳ governance  —  available at every phase"]\n`;
  diagram += `        GOV_CMD["${govCmds}"]\n`;
  diagram += `    end\n\n`;

  // Phase boxes
  phases.forEach(([name, def], i) => {
    const num   = PHASE_NUMERALS[i] || `${i + 1}`;
    const id    = phaseIds[i];
    const cmds  = (def.allowed_commands || []).join('\n');
    diagram += `    subgraph ${id}["${num} ${name}"]\n`;
    diagram += `        ${id}_CMD["${cmds}"]\n`;
    diagram += `    end\n\n`;
  });

  // Governance dashed connections
  diagram += `    GOV -.-> ${phaseIds.join(' & ')}\n\n`;

  // Phase progression arrows
  for (let i = 0; i < phases.length - 1; i++) {
    const exitConds = phases[i][1].exit_conditions || [];
    const label     = exitConds.length ? exitConds[0].replace(/^\.\.\/\.\.\//, '') : '';
    const arrow     = label ? `-->|"${label}"|` : '-->';
    diagram += `    ${phaseIds[i]} ${arrow} ${phaseIds[i + 1]}\n`;
  }

  diagram += '\n';
  diagram += `    style GOV fill:#f1f5f9,stroke:#94a3b8,color:#334155\n`;
  phases.forEach((_, i) => {
    diagram += `    style ${phaseIds[i]}  ${PHASE_STYLES[i % PHASE_STYLES.length]}\n`;
  });
  diagram += '```\n';

  // ── Command availability matrix ───────────────────────────────────────────────
  const phaseHeaders = phases.map(([name], i) => `${PHASE_NUMERALS[i] || i + 1} ${name.replace(/_/g, ' ')}`);
  const colHeaders   = ['Command', ...phaseHeaders, '⟳ always'];

  const allPhaseCmds = new Map();
  phases.forEach(([name, def]) => {
    (def.allowed_commands || []).forEach(cmd => {
      if (!allPhaseCmds.has(cmd)) allPhaseCmds.set(cmd, new Set());
      allPhaseCmds.get(cmd).add(name);
    });
  });
  (gov.allowed_commands || []).forEach(cmd => {
    if (!allPhaseCmds.has(cmd)) allPhaseCmds.set(cmd, new Set());
    allPhaseCmds.get(cmd).add('governance');
  });

  const sep  = `|${colHeaders.map(h => '-'.repeat(h.length + 2)).join('|')}|`;
  const head = `| ${colHeaders.join(' | ')} |`;
  const rows = [...allPhaseCmds.entries()].map(([cmd, inPhases]) => {
    const cells = phases.map(([name]) => inPhases.has(name) ? '✓' : '');
    const govCell = inPhases.has('governance') ? '✓' : '';
    return `| \`${cmd}\` | ${cells.join(' | ')} | ${govCell} |`;
  });

  const matrix = [head, sep, ...rows].join('\n') + '\n';

  // ── Phase summary table ───────────────────────────────────────────────────────
  const summaryRows = phases.map(([name, def], i) => {
    const num    = PHASE_NUMERALS[i] || i + 1;
    const entry  = (def.entry_conditions || []).join(', ') || '—';
    const exit   = (def.exit_conditions  || []).join(', ') || '—';
    return `| ${num} | \`${name}\` | ${entry} | ${exit} |`;
  });
  summaryRows.push(`| ⟳ | \`governance\` | — | — |`);
  const summary = [
    '| # | Phase | Entry Condition | Exit Condition |',
    '|---|-------|----------------|----------------|',
    ...summaryRows,
  ].join('\n') + '\n';

  // ── Assemble ──────────────────────────────────────────────────────────────────
  return [
    '# MDE Workflow Lifecycle\n',
    '> Generated from `mde/ai-instructions/orchestrator.json`\n',
    diagram,
    hr(),
    h2('Command Availability by Phase'),
    '\n' + matrix,
    hr(),
    h2('Phase Summary'),
    '\n' + summary,
    '\n> Solid arrows = phase progression. Dashed arrows = governance commands available at every phase.\n',
  ].join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHODOLOGY RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderMethodology(m) {
  const parts = [];

  parts.push(h1(m.title || 'Methodology'));
  parts.push(kvTable([
    ['methodology', m.methodology],
    ['version',     m.version],
  ]));
  parts.push(hr());

  if (m.principles?.length)
    parts.push(h2('Principles') + '\n' + bullet(m.principles));

  // Workflow patterns
  if (m.workflow_patterns) {
    let wp = h2('Workflow Patterns') + '\n';
    for (const [key, p] of Object.entries(m.workflow_patterns)) {
      wp += h3(p.label || key);
      if (p.description) wp += '\n' + p.description + '\n';
      if (p.steps?.length) {
        wp += '\n**Steps:**\n';
        wp += p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n';
      }
      if (p.inbox_folder_convention) wp += `\n**Folder convention:** ${p.inbox_folder_convention}\n`;
      if (p.question_lifecycle) {
        wp += '\n**Question lifecycle:**\n';
        for (const [k, v] of Object.entries(p.question_lifecycle))
          wp += `- \`${k}\`: ${v}\n`;
      }
      if (p.applies_to?.length)
        wp += `\n**Applies to phases:** ${p.applies_to.join(', ')}\n`;
    }
    parts.push(wp);
  }

  // Module types
  if (m.module_types?.length) {
    const rows = m.module_types.map(t => [`\`${t.id}\``, `**${t.label}** — ${t.description}`]);
    parts.push(h2('Module Types') + '\n' + twoColTable('ID', 'Description', rows));
  }

  // Naming conventions
  if (m.naming_conventions) {
    const nc = m.naming_conventions;
    let s = h2('Naming Conventions') + '\n';
    if (nc.files) {
      const rows = Object.entries(nc.files).map(([k, v]) =>
        [`\`${k}\``, `\`${v.template}\` → \`${v.location}\``]);
      s += h3('Files') + '\n' + twoColTable('Type', 'Template → Location', rows);
    }
    if (nc.ids) {
      const rows = Object.entries(nc.ids).map(([k, v]) =>
        [`\`${k}\``, `\`${v.template}\` (e.g. \`${v.example}\`)`]);
      s += h3('IDs') + '\n' + twoColTable('Type', 'Template (example)', rows);
    }
    parts.push(s);
  }

  // Cross-phase
  if (m.cross_phase) {
    let cp = h2('Governance (Cross-Phase)') + '\n';
    if (m.cross_phase.description) cp += '\n' + m.cross_phase.description + '\n';
    if (m.cross_phase.commands?.length) cp += '\n' + bullet(m.cross_phase.commands);
    parts.push(cp);
  }

  // Phases summary
  if (m.phases?.length) {
    let ph = h2('Phases') + '\n';
    for (const p of m.phases) {
      ph += h3(p.label || p.name);
      if (p.description) ph += '\n' + p.description + '\n';
      if (p.commands?.length) ph += `\n**Commands:** ${p.commands.map(c => `\`${c}\``).join(', ')}\n`;
      const required = (p.docs || []).filter(d => d.required).map(d => d.label);
      if (required.length) ph += `\n**Required docs:** ${required.join(', ')}\n`;
    }
    parts.push(ph);
  }

  return parts.filter(Boolean).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC RUNNERS
// ═══════════════════════════════════════════════════════════════════════════════

function writeDoc(outPath, md) {
  if (DRY_RUN) {
    console.log(`\n${'='.repeat(60)}\n[DRY RUN] ${outPath}\n${'='.repeat(60)}\n${md}`);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`  OK   ${path.relative(path.join(__dirname, '../..'), outPath)}`);
  }
}

function syncFolder(srcDir, docsDir, renderer, label) {
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));
  let ok = 0, errors = 0;
  const entries = []; // collect for index generation
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
    } catch (err) {
      console.error(`  ERR  ${file}: ${err.message}`);
      errors++;
      continue;
    }
    writeDoc(path.join(docsDir, file.replace('.json', '.md')), renderer(data));
    entries.push({ name: file.replace('.json', ''), label: data.label || data.name || file.replace('.json', ''), phase: data.phase || '' });
    ok++;
  }
  // write an index.md so directory links resolve
  if (entries.length) {
    const title = label.charAt(0).toUpperCase() + label.slice(1) + 's';
    const rows  = entries
      .sort((a, b) => (a.phase || '').localeCompare(b.phase || '') || a.label.localeCompare(b.label))
      .map(e => `| [${e.label}](${e.name}.md) | ${e.phase || '—'} |`);
    const idx = [
      `# ${title}\n`,
      `> Generated index — ${entries.length} ${label}(s)\n`,
      '| Name | Phase |',
      '|------|-------|',
      ...rows,
    ].join('\n') + '\n';
    writeDoc(path.join(docsDir, 'index.md'), idx);
  }
  console.log(`\n  ${ok} ${label} doc(s) written${errors ? `, ${errors} error(s)` : ''}`);
}

function syncSingleFile(srcPath, outPath, renderer, label) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  } catch (err) {
    console.error(`  ERR  ${label}: ${err.message}`);
    return;
  }
  writeDoc(outPath, renderer(data));
  console.log(`\n  1 ${label} doc written`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

function main() {
  const runAll          = ONLY === 'all';
  const runSkills       = runAll || ONLY === 'skills';
  const runCommands     = runAll || ONLY === 'commands';
  const runOrchestrator = runAll || ONLY === 'orchestrator';
  const runLifecycle    = runAll || ONLY === 'lifecycle';
  const runMethodology  = runAll || ONLY === 'methodology';

  if (runSkills)
    syncFolder(
      path.join(AI_DIR, 'skills'),
      path.join(DOCS_AI, 'skills'),
      renderSkill,
      'skill'
    );

  if (runCommands)
    syncFolder(
      path.join(AI_DIR, 'commands'),
      path.join(DOCS_AI, 'commands'),
      renderCommand,
      'command'
    );

  if (runOrchestrator)
    syncSingleFile(
      path.join(AI_DIR, 'orchestrator.json'),
      path.join(DOCS_AI, 'orchestrator.md'),
      renderOrchestrator,
      'orchestrator'
    );

  if (runLifecycle)
    syncSingleFile(
      path.join(AI_DIR, 'orchestrator.json'),
      path.join(__dirname, '../docs/lifecycle.md'),
      renderLifecycle,
      'lifecycle'
    );

  if (runMethodology)
    syncSingleFile(
      METHODOLOGY,
      path.join(__dirname, '../docs/methodology.md'),
      renderMethodology,
      'methodology'
    );
}

main();

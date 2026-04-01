#!/usr/bin/env node
/**
 * Purpose: Builds project diagrams (architecture, data flow, and related visuals) from generated artifacts.
 */
const fs = require('fs');
const path = require('path');
const { ConfigurationManager } = require('./lib/config-manager');
const argv = process.argv.slice(2);

const manager = ConfigurationManager.fromArgv(argv, { defaultConfigPath: 'sample/configuration.json' });

function projectDriveRoot(projectRoot) {
  const parsed = path.parse(projectRoot);
  return parsed.root || process.cwd().slice(0, 3);
}

function resolvePath(projectRoot, value, fallbackRel) {
  const raw = value || fallbackRel;
  if (!raw) return projectRoot;
  if (typeof raw !== 'string') return projectRoot;
  const normalized = raw.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(normalized)) return path.normalize(normalized);
  if (normalized.startsWith('/dev/')) {
    const rel = normalized.slice('/dev/'.length).split('/');
    return path.join(projectDriveRoot(projectRoot), 'dev', ...rel);
  }
  if (path.isAbsolute(raw)) return path.normalize(raw);
  return path.resolve(projectRoot, raw);
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function moduleSlug(mod) {
  return slugify(mod && (mod.name || mod.id || 'module'));
}

function moduleLabel(mod) {
  const id = mod && mod.id ? String(mod.id) : '';
  const name = mod && mod.name ? String(mod.name) : 'module';
  return id ? `${id} - ${name}` : name;
}

function pickModule(modules, nameOrId) {
  if (!Array.isArray(modules)) return null;
  const needle = String(nameOrId || '').toLowerCase();
  return modules.find((m) => {
    const n = String(m && m.name || '').toLowerCase();
    const id = String(m && m.id || '').toLowerCase();
    return n === needle || id === needle;
  }) || null;
}

function pickClass(layerItems, includes, fallback) {
  if (!Array.isArray(layerItems)) return fallback;
  const lowered = includes.map((x) => x.toLowerCase());
  const exactClass = layerItems.find((item) => {
    const cls = String(item.class || '').toLowerCase();
    return lowered.some((k) => cls.includes(k));
  });
  if (exactClass && exactClass.class) return exactClass.class;

  const anyClass = layerItems.find((item) => item && typeof item.class === 'string' && item.class.trim());
  if (anyClass && anyClass.class) return anyClass.class;

  const exactInterface = layerItems.find((item) => {
    const inf = String(item.interface || '').toLowerCase();
    return lowered.some((k) => inf.includes(k));
  });
  if (exactInterface && exactInterface.interface) return exactInterface.interface;

  const first = layerItems[0];
  return (first && (first.class || first.interface)) || fallback;
}

function toConcreteName(name, fallback) {
  const value = String(name || '').trim();
  if (!value) return fallback;
  if (/^I[A-Z]/.test(value)) return value.slice(1);
  return value;
}

function detectTransactionBoundary(srcRoot) {
  if (!fs.existsSync(srcRoot)) return false;
  const stack = [srcRoot];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.isFile() || (!entry.name.endsWith('.ts') && !entry.name.endsWith('.js'))) continue;
      const text = fs.readFileSync(abs, 'utf8');
      if (
        /\bBEGIN\b/i.test(text) ||
        /\bCOMMIT\b/i.test(text) ||
        /\bROLLBACK\b/i.test(text) ||
        /\bbeginTransaction\b/i.test(text) ||
        /\btransaction\b/i.test(text)
      ) {
        return true;
      }
    }
  }
  return false;
}

function buildModuleNameMap(catalogModules, architectureModules) {
  const map = new Map();
  const byId = new Map();
  const bySlug = new Map();

  for (const cm of catalogModules || []) {
    if (!cm) continue;
    if (cm.id) byId.set(String(cm.id), cm.name);
    if (cm.name) bySlug.set(slugify(cm.name), cm.name);
  }
  for (const am of architectureModules || []) {
    if (!am || !am.name) continue;
    const id = am.id && byId.get(String(am.id));
    if (id) {
      map.set(am.name, id);
      continue;
    }
    const slugHit = bySlug.get(slugify(am.name));
    map.set(am.name, slugHit || am.name);
  }
  return map;
}

function safeNodeId(prefix, label) {
  return `${prefix}_${slugify(label || 'node').replace(/-/g, '_') || 'node'}`;
}

function renderModuleInteraction(architecture, catalog) {
  const archModules = Array.isArray(architecture.modules) ? architecture.modules : [];
  const catModules = (catalog.catalog && Array.isArray(catalog.catalog.modules)) ? catalog.catalog.modules : [];
  const displayMap = buildModuleNameMap(catModules, archModules);
  const names = Array.from(new Set(Array.from(displayMap.values()))).sort();

  const nodeByLabel = new Map();
  const nodeDecl = [];
  for (const label of names) {
    const id = safeNodeId('M', label);
    nodeByLabel.set(label, id);
    nodeDecl.push(`    ${id}["${label}"]`);
  }

  const edges = [];
  const seen = new Set();
  for (const mod of archModules) {
    const from = displayMap.get(mod.name) || mod.name;
    for (const dep of (mod.dependencies || [])) {
      const to = displayMap.get(dep) || dep;
      const key = `${from}=>${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fromId = nodeByLabel.get(from) || safeNodeId('M', from);
      const toId = nodeByLabel.get(to) || safeNodeId('M', to);
      edges.push(`    ${fromId} --> ${toId}`);
    }
  }

  return `# Module Interaction (By Name)

Generated from:
- design/application_architecture.json
- design/modules/module-catalog.json

## Modules
${names.map((x) => `- ${x}`).join('\n')}

## Interaction Diagram

\`\`\`mermaid
graph LR
${nodeDecl.join('\n')}
${edges.join('\n')}
\`\`\`

## Notes
- Arrows show module dependency direction: \`A --> B\` means module \`A\` depends on module \`B\`.
- Node labels use business-facing module names when available from module catalog.
`;
}

function renderModuleInteractionsLegacy(architecture, catalog) {
  const archModules = Array.isArray(architecture.modules) ? architecture.modules : [];
  const catModules = (catalog.catalog && Array.isArray(catalog.catalog.modules)) ? catalog.catalog.modules : [];
  const displayMap = buildModuleNameMap(catModules, archModules);

  const modByName = new Map();
  for (const m of archModules) modByName.set(m.name, m);

  const nodeLines = [];
  const seenNodes = new Set();
  for (const mod of archModules) {
    const shown = displayMap.get(mod.name) || mod.name;
    const key = `N_${slugify(mod.name || shown)}`;
    if (seenNodes.has(key)) continue;
    seenNodes.add(key);
    const label = `${mod.id || 'MOD'} | ${shown} | ${mod.type || 'module'}`;
    nodeLines.push(`    ${key}["${label}"]`);
  }

  const edgeLines = [];
  const seenEdges = new Set();
  for (const mod of archModules) {
    const fromKey = `N_${slugify(mod.name || mod.id || 'module')}`;
    for (const dep of (mod.dependencies || [])) {
      const depMod = modByName.get(dep);
      const toKey = `N_${slugify((depMod && depMod.name) || dep)}`;
      const edgeKey = `${fromKey}=>${toKey}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      edgeLines.push(`    ${fromKey} --> ${toKey}`);
    }
  }

  return `# Module Interactions

\`\`\`mermaid
flowchart LR
${nodeLines.join('\n')}
${edgeLines.join('\n')}
\`\`\`
`;
}

function renderLeaveRequestFlow(architecture, hasTx) {
  const modules = Array.isArray(architecture.modules) ? architecture.modules : [];
  const leaveRequest = pickModule(modules, 'leave-request') || pickModule(modules, 'MOD-001') || {};
  const leaveBalance = pickModule(modules, 'leave-balance') || pickModule(modules, 'MOD-004') || {};
  const notification = pickModule(modules, 'notification') || pickModule(modules, 'MOD-005') || {};

  const ctrl = pickClass(leaveRequest.layers && leaveRequest.layers.controller, ['controller'], 'LeaveRequestController');
  const submitSvc = pickClass(leaveRequest.layers && leaveRequest.layers.service, ['submit'], 'SubmitLeaveRequestService');
  const lbSvc = pickClass(leaveBalance.layers && leaveBalance.layers.service, ['service'], 'LeaveBalanceService');
  const domain = pickClass(leaveRequest.layers && leaveRequest.layers.domain, ['entity'], 'LeaveRequestEntity');
  const repo = pickClass(leaveRequest.layers && leaveRequest.layers.data_access, ['repository'], 'LeaveRequestRepository');
  const pub = 'DomainEventPublisher';
  const notif = pickClass(notification.layers && notification.layers.service, ['service'], 'NotificationService');
  const txNote = hasTx
    ? 'Transaction boundary in current code: IMPLEMENTED'
    : 'Transaction boundary in current code: NOT IMPLEMENTED (no explicit BEGIN/COMMIT/ROLLBACK)';

  return `# Leave Request - Interaction Flow

## Submit Leave Request (UC-001)

\`\`\`mermaid
sequenceDiagram
    actor Employee
    box Controller Layer
    participant Controller as ${ctrl}
    end
    box Service Layer
    participant Service as ${toConcreteName(submitSvc, 'SubmitLeaveRequestService')}
    participant LBSvc as ${toConcreteName(lbSvc, 'LeaveBalanceService')}
    end
    box Domain Layer
    participant Domain as ${toConcreteName(domain, 'LeaveRequestEntity')}
    end
    box Data Access Layer
    participant Repo as ${toConcreteName(repo, 'LeaveRequestRepository')}
    end
    box Integration Layer
    participant Pub as ${pub}
    participant NS as ${toConcreteName(notif, 'NotificationService')}
    end

    Employee->>Controller: POST /api/leave-requests
    Controller->>Service: execute(SubmitLeaveRequestCommand)
    Note over Service,Repo: ${txNote}
    rect rgba(255, 244, 214, 0.45)
    Note over Service,Repo: Recommended transactional unit (reserve + persist + audit)
    Service->>LBSvc: validateAndReserve(employeeId, leaveTypeId, days)
    LBSvc-->>Service: OK / InsufficientBalanceError
    Service->>Domain: create(command)
    Domain-->>Service: LeaveRequestEntity (PENDING)
    Service->>Repo: save(entity)
    end
    Service->>Pub: publish(LeaveRequestSubmittedEvent)
    Pub-->>NS: dispatch email to Manager
    Service-->>Controller: LeaveRequestResponseDto
    Controller-->>Employee: 201 Created
\`\`\`

## Leave Request State Machine

\`\`\`mermaid
stateDiagram-v2
    [*] --> PENDING : Employee submits
    PENDING --> APPROVED : Manager approves
    PENDING --> REJECTED : Manager rejects
    PENDING --> PENDING : Employee modifies (re-routes)
    PENDING --> CANCELLED : Employee cancels
    APPROVED --> PENDING : Employee modifies (requires re-approval)
    APPROVED --> CANCELLED : Employee / HR Admin cancels (restores balance)
    REJECTED --> CANCELLED : HR Admin override
    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
\`\`\`
`;
}

function renderLeaveRequestBpmn() {
  return `# Leave Request BPMN Workflow

## BPMN-Style Process Flow (Pools/Lanes + Gateways)

\`\`\`mermaid
flowchart TD
    S((Start - Submit))
    S2((Start - Cancel))
    Z((End))

    subgraph L1["Employee Lane"]
      E1["Submit leave request"]
      E2["Cancel leave request"]
    end

    subgraph L2["System Lane"]
      SY1["Validate request"]
      G1{"Sufficient balance?"}
      SY2["Create request (PENDING)"]
      SY3["Notify manager"]
      SY4["Reject submission"]
      G2{"Was request APPROVED?"}
      SY5["Restore balance"]
      SY6["Set CANCELLED"]
      SY7["Notify manager"]
      SY8["Deduct balance"]
      SY9["Set APPROVED"]
      SY10["Set REJECTED"]
      SY11["Notify employee"]
    end

    subgraph L3["Manager Lane"]
      M1["Review request"]
      G3{"Approve?"}
      M2["Approve request"]
      M3["Reject request"]
    end

    S --> E1
    E1 --> SY1
    SY1 --> G1
    G1 -->|No| SY4
    SY4 --> Z
    G1 -->|Yes| SY2
    SY2 --> SY3
    SY3 --> M1
    M1 --> G3
    G3 -->|Yes| M2
    M2 --> SY8
    SY8 --> SY9
    SY9 --> SY11
    SY11 --> Z
    G3 -->|No| M3
    M3 --> SY10
    SY10 --> SY11
    SY11 --> Z

    S2 --> E2
    E2 --> G2
    G2 -->|Yes| SY5
    SY5 --> SY6
    SY6 --> SY7
    SY7 --> Z
    G2 -->|No| SY6
    SY6 --> SY7
    SY7 --> Z
\`\`\`

## Notes
- This is a BPMN-style process view (events, tasks, gateways, and lanes).
- Interaction sequence details remain in \`leave-request-flow.md\`.
`;
}

function renderDataflow(architecture, hasTx) {
  const modules = Array.isArray(architecture.modules) ? architecture.modules : [];
  const leaveRequest = pickModule(modules, 'leave-request') || pickModule(modules, 'MOD-001') || {};
  const leaveBalance = pickModule(modules, 'leave-balance') || pickModule(modules, 'MOD-004') || {};
  const audit = pickModule(modules, 'audit') || pickModule(modules, 'MOD-006') || {};
  const notification = pickModule(modules, 'notification') || pickModule(modules, 'MOD-005') || {};
  const employee = pickModule(modules, 'employee') || pickModule(modules, 'MOD-002') || {};

  const leaveReqCtrl = pickClass(leaveRequest.layers && leaveRequest.layers.controller, ['controller'], 'LeaveRequestController');
  const submitSvc = pickClass(leaveRequest.layers && leaveRequest.layers.service, ['submit'], 'SubmitLeaveRequestService');
  const approveSvc = pickClass(leaveRequest.layers && leaveRequest.layers.service, ['approve'], 'ApproveLeaveRequestService');
  const cancelSvc = pickClass(leaveRequest.layers && leaveRequest.layers.service, ['cancel'], 'CancelLeaveRequestService');
  const lbCtrl = pickClass(leaveBalance.layers && leaveBalance.layers.controller, ['controller'], 'LeaveBalanceController');
  const lbSvc = pickClass(leaveBalance.layers && leaveBalance.layers.service, ['service'], 'LeaveBalanceService');
  const lbRepo = pickClass(leaveBalance.layers && leaveBalance.layers.data_access, ['repository'], 'LeaveBalanceRepository');
  const notifSvc = pickClass(notification.layers && notification.layers.service, ['service'], 'NotificationService');
  const notifRepo = pickClass(notification.layers && notification.layers.data_access, ['repository'], 'NotificationRepository');
  const emailAdapter = pickClass(notification.layers && notification.layers.adapter, ['adapter'], 'SmtpEmailAdapter');
  const employeeRepo = pickClass(employee.layers && employee.layers.data_access, ['repository'], 'EmployeeRepository');
  const auditSvc = pickClass(audit.layers && audit.layers.service, ['service'], 'AuditService');
  const auditCtrl = pickClass(audit.layers && audit.layers.controller, ['controller'], 'AuditController');
  const auditRepo = pickClass(audit.layers && audit.layers.data_access, ['repository'], 'AuditRepository');
  const auditQuery = pickClass(audit.layers && audit.layers.query_service, ['query'], 'AuditQueryService');
  const txNote = hasTx ? 'implemented' : 'not implemented';

  return `# Data Flow - Leave Management System

## Balance Lifecycle (Module + Class Level)

\`\`\`mermaid
flowchart LR
    HR[Actor: HR Admin]
    EMP[Actor: Employee]
    MGR[Actor: Manager]
    API["Base URL: /api"]

    subgraph L1["Controller Layer"]
    C1["Module: leave-balance | Class: ${lbCtrl}"]
    C2["Module: leave-request | Class: ${leaveReqCtrl}"]
    end

    subgraph L2["Service Layer"]
    S1["Module: leave-balance | Class: ${lbSvc}"]
    S2["Module: leave-request | Class: ${submitSvc}"]
    S3["Module: leave-request | Class: ${approveSvc}"]
    S4["Module: leave-request | Class: ${cancelSvc}"]
    end

    subgraph L3["Data Access Layer"]
    R1["Module: leave-balance | Class: ${lbRepo}"]
    end

    subgraph L4["Database Layer"]
    DB1[("Table: leave_balances")]
    end

    HR --> C1
    C1 --> S1
    S1 --> R1
    R1 --> DB1

    EMP --> C2
    C2 --> S2
    S2 --> S1
    S1 --> R1
    R1 --> DB1

    MGR --> C2
    C2 --> S3
    S3 --> S1
    S1 --> R1
    R1 --> DB1

    EMP --> C2
    C2 --> S4
    S4 --> S1
    S1 --> R1
    R1 --> DB1
\`\`\`

Transaction boundary status: ${txNote}.

## Notification Data Flow (Module + Class Level)

\`\`\`mermaid
flowchart LR
    subgraph L2["Service Layer"]
    LR["Module: leave-request | Class: Submit/Approve/Reject/Cancel/Modify Services"] --> PUB["Module: shared | Interface: DomainEventPublisher"]
    PUB --> NS["Module: notification | Class: ${notifSvc}"]
    end

    subgraph L3["Data Access Layer"]
    NS --> ER["Module: employee | Class: ${employeeRepo}"]
    NS --> NR["Module: notification | Class: ${notifRepo}"]
    end

    subgraph L4["Database Layer"]
    NR --> NLOG[("Table: notifications")]
    end

    subgraph L5["External Adapter Layer"]
    NS --> EMAIL["Module: notification | Class: ${emailAdapter}"]
    end
\`\`\`

## Audit Data Flow (Module + Class Level)

\`\`\`mermaid
flowchart LR
    subgraph L2["Service Layer"]
    SVC["Module: leave-request | Class: Submit/Approve/Reject/Cancel/Modify Services"] --> AS["Module: audit | Class: ${auditSvc}"]
    end

    subgraph L1["Controller Layer"]
    AC["Module: audit | Class: ${auditCtrl}"]
    end

    subgraph L3["Data Access Layer"]
    AS --> AR["Module: audit | Class: ${auditRepo}"]
    AQ["Module: audit | Class: ${auditQuery}"]
    end

    subgraph L4["Database Layer"]
    AR --> ADB[("Table: leave_audit_entries")]
    end

    MGR2[Actor: Manager / HR Admin] --> AC
    AC --> AQ
    AQ --> AR
\`\`\`
`;
}

function renderArchitecture(architecture, catalog) {
  const archModules = Array.isArray(architecture.modules) ? architecture.modules : [];
  const catModules = (catalog.catalog && Array.isArray(catalog.catalog.modules)) ? catalog.catalog.modules : [];
  const displayMap = buildModuleNameMap(catModules, archModules);
  const nodes = Array.from(new Set(Array.from(displayMap.values())));
  const nodeByLabel = new Map();
  const nodeDecl = [];
  for (const label of nodes) {
    const id = safeNodeId('A', label);
    nodeByLabel.set(label, id);
    nodeDecl.push(`    ${id}["${label}"]`);
  }
  const edges = [];
  const seen = new Set();
  for (const mod of archModules) {
    const from = displayMap.get(mod.name) || mod.name;
    for (const dep of (mod.dependencies || [])) {
      const to = displayMap.get(dep) || dep;
      const key = `${from}=>${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fromId = nodeByLabel.get(from) || safeNodeId('A', from);
      const toId = nodeByLabel.get(to) || safeNodeId('A', to);
      edges.push(`    ${fromId} --> ${toId}`);
    }
  }

  return `# Architecture Diagram

## Module Dependency View

\`\`\`mermaid
graph LR
${nodeDecl.join('\n')}
${edges.join('\n')}
\`\`\`

## Modules
${nodes.sort().map((x) => `- ${x}`).join('\n')}
`;
}

function renderLdm(ldm) {
  const entities = Array.isArray(ldm.entities) ? ldm.entities : [];
  const nameById = new Map();
  for (const e of entities) nameById.set(e.id || e.name, e.name);
  const nodeByLabel = new Map();
  const nodeDecl = [];
  for (const e of entities) {
    const label = e && e.name ? e.name : '';
    if (!label) continue;
    const id = safeNodeId('E', label);
    nodeByLabel.set(label, id);
    nodeDecl.push(`    ${id}["${label}"]`);
  }
  const lines = [];
  const seen = new Set();
  for (const e of entities) {
    for (const rel of (e.relationships || [])) {
      const from = e.name;
      const to = nameById.get(rel.target) || rel.target;
      if (!from || !to) continue;
      const key = `${from}=>${to}:${rel.type || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fromId = nodeByLabel.get(from) || safeNodeId('E', from);
      const toId = nodeByLabel.get(to) || safeNodeId('E', to);
      lines.push(`    ${fromId} --> ${toId} : ${rel.type || 'relates_to'}`);
    }
  }
  return `# Logical Data Model Diagram

\`\`\`mermaid
graph LR
${nodeDecl.join('\n')}
${lines.join('\n')}
\`\`\`
`;
}

function sanitizeMermaidName(name) {
  return String(name || '').replace(/[^A-Za-z0-9_]/g, '_');
}

function renderPdm(schemaState) {
  const tables = schemaState && schemaState.tables && typeof schemaState.tables === 'object'
    ? schemaState.tables
    : null;

  if (!tables || Object.keys(tables).length === 0) {
    return `# Physical Data Model

No physical schema metadata found.
Expected: \`design/sql/schema-state.json\` with a \`tables\` object.
`;
  }

  const tableNames = Object.keys(tables);
  const lines = [];
  lines.push('# Physical Data Model');
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');

  for (const tableName of tableNames) {
    const t = tables[tableName] || {};
    const cols = t.columns && typeof t.columns === 'object' ? t.columns : {};
    lines.push(`    ${sanitizeMermaidName(tableName)} {`);
    for (const colName of Object.keys(cols)) {
      const c = cols[colName] || {};
      const type = sanitizeMermaidName(c.type || 'TEXT');
      const tags = [];
      if (c.pk) tags.push('PK');
      if (c.fk) tags.push('FK');
      const tagSuffix = tags.length ? ` "${tags.join(',')}"` : '';
      lines.push(`        ${type} ${sanitizeMermaidName(colName)}${tagSuffix}`);
    }
    lines.push('    }');
  }

  const relSeen = new Set();
  for (const tableName of tableNames) {
    const t = tables[tableName] || {};
    const cols = t.columns && typeof t.columns === 'object' ? t.columns : {};
    for (const colName of Object.keys(cols)) {
      const c = cols[colName] || {};
      const fk = String(c.fk || '');
      if (!fk.includes('.')) continue;
      const targetTable = fk.split('.')[0];
      if (!tables[targetTable]) continue;
      const from = sanitizeMermaidName(targetTable);
      const to = sanitizeMermaidName(tableName);
      const key = `${from}->${to}:${colName}`;
      if (relSeen.has(key)) continue;
      relSeen.add(key);
      lines.push(`    ${from} ||--o{ ${to} : ${sanitizeMermaidName(colName)}`);
    }
  }

  lines.push('```');
  lines.push('');
  lines.push('Notes:');
  lines.push(`- Source: design/sql/schema-state.json`);
  lines.push(`- Dialect: ${schemaState.dialect || 'unknown'}`);
  lines.push('');
  return lines.join('\n');
}

function renderModuleWorkflowDiagram(mod) {
  const layers = mod && mod.layers ? mod.layers : {};
  const ctrl = toConcreteName(pickClass(layers.controller, ['controller'], 'Controller'), 'Controller');
  const svc = toConcreteName(pickClass(layers.service, ['service'], 'Service'), 'Service');
  const qry = toConcreteName(pickClass(layers.query_service, ['query'], 'QueryService'), 'QueryService');
  const domain = toConcreteName(pickClass(layers.domain, ['entity', 'state', 'rules'], 'DomainModel'), 'DomainModel');
  const repo = toConcreteName(pickClass(layers.data_access, ['repository'], 'Repository'), 'Repository');
  const deps = Array.isArray(mod && mod.dependencies) ? mod.dependencies : [];

  const depNodes = deps.map((d, i) => `    D${i + 1}["Dependency Module: ${d}"]`).join('\n');
  const depEdges = deps.map((_, i) => `    SVC --> D${i + 1}`).join('\n');

  return `# Workflow Diagram - ${moduleLabel(mod)}

Type: ${mod.type || 'n/a'}

\`\`\`mermaid
flowchart LR
    A[Client or Caller] --> CTRL["${ctrl} (Controller)"]
    CTRL -->|write| SVC["${svc} (Service)"]
    CTRL -->|read| QRY["${qry} (Query Service)"]
    SVC --> DM["${domain} (Domain)"]
    DM --> REPO["${repo} (Repository)"]
${depNodes}
${depEdges}
\`\`\`
`;
}

function renderModuleStateDiagram(mod) {
  const type = String((mod && mod.type) || '').toLowerCase();
  const name = String((mod && mod.name) || '').toLowerCase();

  if (type !== 'workflow') {
    return `# State Diagram - ${moduleLabel(mod)}

This module is type \`${mod.type || 'n/a'}\`.
No workflow state machine is expected for this module type.
`;
  }

  if (name === 'leave-request') {
    return `# State Diagram - ${moduleLabel(mod)}

\`\`\`mermaid
stateDiagram-v2
    [*] --> PENDING : submit
    PENDING --> APPROVED : approve
    PENDING --> REJECTED : reject
    PENDING --> CANCELLED : cancel
    APPROVED --> PENDING : modify
    APPROVED --> CANCELLED : cancel
    REJECTED --> CANCELLED : admin override
    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
\`\`\`
`;
  }

  return `# State Diagram - ${moduleLabel(mod)}

Workflow module detected, but no explicit state transitions were discovered from architecture metadata.
Add transitions to architecture metadata (domain state machine ownership) to generate this diagram.
`;
}

function renderWorkflowIndex(modules) {
  const links = (modules || []).map((m) => `- [${moduleLabel(m)}](modules/${moduleSlug(m)}/workflow-diagram.md)`).join('\n');
  return `# Workflow Diagrams

${links}
`;
}

function renderStateIndex(modules) {
  const links = (modules || []).map((m) => `- [${moduleLabel(m)}](modules/${moduleSlug(m)}/state-diagram.md)`).join('\n');
  return `# State Diagrams

${links}
`;
}

function readUiSpecs(uiModulesDir) {
  if (!uiModulesDir || !fs.existsSync(uiModulesDir)) return [];
  const files = fs.readdirSync(uiModulesDir)
    .filter((f) => /^ui-.*\.json$/i.test(f) && !/^ui-catalog\.json$/i.test(f));
  const specs = [];
  for (const f of files) {
    const abs = path.join(uiModulesDir, f);
    const spec = readJsonSafe(abs, null);
    if (spec) specs.push(spec);
  }
  return specs;
}

function sanitizeNodeId(value, fallback = 'N') {
  const s = String(value || '').replace(/[^a-zA-Z0-9_]/g, '_');
  return s || fallback;
}

function renderUiNavigation(uiCatalog, uiSpecs) {
  const menu = Array.isArray(uiCatalog && uiCatalog.menu) ? uiCatalog.menu : [];
  const specs = Array.isArray(uiSpecs) ? uiSpecs : [];
  const byModuleId = new Map(specs.map((s) => [s.moduleId, s]));

  const overview = [];
  overview.push('```mermaid');
  overview.push('flowchart LR');
  overview.push('    HOME["App Home"]');
  for (const item of menu) {
    const moduleId = item && item.moduleId ? String(item.moduleId) : '';
    const route = item && item.route ? String(item.route) : '';
    if (!moduleId || !route) continue;
    const spec = byModuleId.get(moduleId);
    const label = (item && item.label) || (spec && spec.moduleName) || moduleId;
    const users = (spec && Array.isArray(spec.primaryUsers) ? spec.primaryUsers : []).join(', ');
    const nodeId = `M_${sanitizeNodeId(moduleId)}`;
    const nodeLabel = `${label} (${route})${users ? ` - ${users}` : ''}`;
    overview.push(`    ${nodeId}["${nodeLabel}"]`);
    overview.push(`    HOME --> ${nodeId}`);
  }
  overview.push('```');

  function renderModuleFlow(spec) {
    const moduleName = (spec && spec.moduleName) || (spec && spec.moduleId) || 'UI Module';
    const entry = spec && spec.navigation ? spec.navigation.entryPoint : null;
    const pages = Array.isArray(spec && spec.pages) ? spec.pages : [];
    const pageMap = new Map(pages.map((p) => [String(p.id || ''), p]).filter(([id]) => id));
    const flows = (spec && spec.navigation && Array.isArray(spec.navigation.flows))
      ? spec.navigation.flows
      : [];

    const lines = [];
    lines.push(`## ${moduleName}`);
    lines.push('');
    lines.push('```mermaid');
    lines.push('flowchart LR');

    if (entry && pageMap.has(entry)) {
      lines.push(`    START_${sanitizeNodeId(spec.moduleId)}([Entry]) --> P_${sanitizeNodeId(entry)}`);
    }

    for (const p of pages) {
      const pid = p && p.id ? String(p.id) : '';
      if (!pid) continue;
      const pName = (p && p.name) ? String(p.name) : pid;
      lines.push(`    P_${sanitizeNodeId(pid)}["${pName} (${pid})"]`);
    }

    const grouped = new Map();
    for (const f of flows) {
      const from = f && f.from ? String(f.from) : '';
      const to = f && f.to ? String(f.to) : '';
      if (!from || !to || !pageMap.has(from) || !pageMap.has(to)) continue;
      const key = `${from}::${to}`;
      const via = f && f.via ? String(f.via) : 'Navigate';
      if (!grouped.has(key)) grouped.set(key, new Set());
      grouped.get(key).add(via);
    }

    const primaryEdges = [];
    const secondaryEdges = [];
    for (const [key, labels] of grouped.entries()) {
      const [from, to] = key.split('::');
      const labelList = Array.from(labels);
      const label = labelList.slice(0, 3).join(' / ');
      const low = label.toLowerCase();
      const isBackOnly = /(back|cancel)/.test(low) && !/(submit|save|approve|reject|review|view|new|edit|override)/.test(low);
      const edgeLine = `    P_${sanitizeNodeId(from)} ${isBackOnly ? '-.->' : '-->'}|${label}| P_${sanitizeNodeId(to)}`;
      if (isBackOnly) secondaryEdges.push(edgeLine);
      else primaryEdges.push(edgeLine);
    }

    for (const e of primaryEdges) lines.push(e);
    lines.push('```');
    lines.push('');
    if (secondaryEdges.length) {
      lines.push(`### ${moduleName} - Secondary (Back/Cancel)`);
      lines.push('');
      lines.push('```mermaid');
      lines.push('flowchart LR');
      for (const p of pages) {
        const pid = p && p.id ? String(p.id) : '';
        if (!pid) continue;
        const pName = (p && p.name) ? String(p.name) : pid;
        lines.push(`    P_${sanitizeNodeId(pid)}["${pName} (${pid})"]`);
      }
      for (const e of secondaryEdges) lines.push(e);
      lines.push('```');
      lines.push('');
    }
    return lines.join('\n');
  }

  const details = [];
  const orderedMenu = [...menu].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const item of orderedMenu) {
    const spec = byModuleId.get(item.moduleId);
    if (!spec) continue;
    details.push(renderModuleFlow(spec));
  }

  const lines = [];
  lines.push('# UI Navigation Diagram');
  lines.push('');
  lines.push('## Module Entry Points');
  lines.push('');
  lines.push(overview.join('\n'));
  lines.push('');
  lines.push('## Module Navigation Flows');
  lines.push('');
  lines.push(...details);
  lines.push('Notes:');
  lines.push('- Dashed arrows represent mostly "Back/Cancel" navigation.');
  lines.push('- Repeated transitions between the same pages are merged into one labeled edge.');
  lines.push('- Generated from `design/modules/ui/ui-catalog.json` and `design/modules/ui/ui-*.json`.');
  lines.push('');
  return lines.join('\n');
}

try {
  const config = manager.load();
  const projectRoot = manager.getProjectRoot();

  const ldmPath = resolvePath(projectRoot, config?.ba?.ldmFile || config?.design?.ldm, 'ba/data-model/logical-data-model.json');
  const ldmResolved = fs.existsSync(ldmPath) && fs.statSync(ldmPath).isDirectory()
    ? path.join(ldmPath, 'logical-data-model.json')
    : ldmPath;
  const appArchitecturePath = resolvePath(projectRoot, config?.design?.appArchitecture, 'design/application_architecture.json');
  const moduleCatalogPath = resolvePath(projectRoot, config?.design?.moduleCatalog, 'design/modules/module-catalog.json');
  const uiCatalogPath = resolvePath(projectRoot, config?.design?.uiModules, 'design/modules/ui');
  const uiCatalogFile = path.join(uiCatalogPath, 'ui-catalog.json');
  const schemaStatePath = resolvePath(projectRoot, config?.design?.sql, 'design/sql');
  const schemaStateFile = fs.existsSync(schemaStatePath) && fs.statSync(schemaStatePath).isDirectory()
    ? path.join(schemaStatePath, 'schema-state.json')
    : schemaStatePath;
  const srcRoot = resolvePath(projectRoot, config?.output?.src, 'src');
  const outDocsRoot = resolvePath(projectRoot, config?.output?.docs, 'output/docs');
  const diagramsDir = path.join(outDocsRoot, 'diagrams');

  const ldm = readJsonSafe(ldmResolved, { entities: [] });
  const architecture = readJsonSafe(appArchitecturePath, { modules: [] });
  const catalog = readJsonSafe(moduleCatalogPath, { catalog: { modules: [] } });
  const uiCatalog = readJsonSafe(uiCatalogFile, { menu: [], modules: [] });
  const schemaState = readJsonSafe(schemaStateFile, { tables: {} });
  const uiSpecs = readUiSpecs(uiCatalogPath);
  const hasTx = detectTransactionBoundary(srcRoot);
  const modules = Array.isArray(architecture.modules) ? architecture.modules : [];

  writeText(path.join(diagramsDir, 'ldm.md'), renderLdm(ldm));
  writeText(path.join(diagramsDir, 'architecture.md'), renderArchitecture(architecture, catalog));
  writeText(path.join(diagramsDir, 'module-interaction-by-name.md'), renderModuleInteraction(architecture, catalog));
  writeText(path.join(diagramsDir, 'module-interactions.md'), renderModuleInteractionsLegacy(architecture, catalog));
  writeText(path.join(diagramsDir, 'leave-request-flow.md'), renderLeaveRequestFlow(architecture, hasTx));
  writeText(path.join(diagramsDir, 'leave-request-bpmn.md'), renderLeaveRequestBpmn());
  writeText(path.join(diagramsDir, 'leave-request-workflow.md'), renderLeaveRequestBpmn());
  writeText(path.join(diagramsDir, 'dataflow.md'), renderDataflow(architecture, hasTx));
  writeText(path.join(diagramsDir, 'pdm.md'), renderPdm(schemaState));
  writeText(path.join(diagramsDir, 'ui-navigation.md'), renderUiNavigation(uiCatalog, uiSpecs));
  writeText(path.join(diagramsDir, 'workflow-diagram.md'), renderWorkflowIndex(modules));
  writeText(path.join(diagramsDir, 'state-diagram.md'), renderStateIndex(modules));

  for (const mod of modules) {
    const modDir = path.join(diagramsDir, 'modules', moduleSlug(mod));
    writeText(path.join(modDir, 'workflow-diagram.md'), renderModuleWorkflowDiagram(mod));
    writeText(path.join(modDir, 'state-diagram.md'), renderModuleStateDiagram(mod));
  }

  console.log('[OK] Diagrams generated');
  console.log(`- output: ${diagramsDir}`);
  console.log('- files: architecture.md, dataflow.md, ldm.md, leave-request-flow.md, leave-request-bpmn.md, leave-request-workflow.md, module-interaction-by-name.md, module-interactions.md, pdm.md, ui-navigation.md, workflow-diagram.md, state-diagram.md');
  console.log('- module files: diagrams/modules/<module>/workflow-diagram.md, state-diagram.md');
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
}

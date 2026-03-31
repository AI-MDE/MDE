import * as fs   from 'fs';
import * as path from 'path';

type AnyObj = Record<string, any>;

export interface DashboardFileConfig {
  // data file paths
  project?:   string;
  phases?:    string;   // docs.json / view.json manifest (sections → phases)
  tasks?:     string;
  artifacts?: string;   // can be project-state.json (artifacts object) or dedicated file
  blockers?:  string;   // can be project-state.json (failed_commands) or dedicated file
  activity?:  string;   // can be .jsonl command log or dedicated file
  decisions?: string;
  // context injected by resolveDashboardFiles
  _projectName?: string;
}

// ── File readers ───────────────────────────────────────────────────────────────

function readJsonSafe(filePath: string | undefined, fallback: any): any {
  try {
    if (!filePath) return fallback;
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return fallback;
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonlSafe(filePath: string | undefined): AnyObj[] {
  try {
    if (!filePath) return [];
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return [];
    return fs.readFileSync(resolved, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean) as AnyObj[];
  } catch {
    return [];
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function pickArray(source: AnyObj | undefined, keys: string[]): AnyObj[] {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source![key];
  }
  return [];
}

function asIso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function daysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

// ── Normalizers ────────────────────────────────────────────────────────────────

function normalizeProject(raw: any, projectName?: string): AnyObj {
  // Handle project-state.json format
  if (raw?.current_phase !== undefined || raw?.completed_commands !== undefined) {
    const completedCount = (raw.completed_commands || []).length;
    const failedCount    = (raw.failed_commands    || []).length;
    const pct = completedCount > 0
      ? clamp(Math.round(completedCount / Math.max(completedCount + 3, 16) * 100), 0, 100)
      : 0;
    return {
      id:              'project-1',
      name:            projectName || 'AI-MDE Project',
      status:          failedCount > 0 ? 'At Risk' : pct >= 80 ? 'On Track' : 'On Track',
      currentPhase:    raw.current_phase || null,
      owner:           null,
      startedAt:       null,
      targetDate:      null,
      percentComplete: pct,
      summary:         `Last command: ${raw.last_command || '—'}`,
      _raw:            raw,
    };
  }
  // Generic format
  const p = raw?.project || raw || {};
  return {
    id:              p.id              || 'project-1',
    name:            p.name || p.projectName || projectName || 'AI-MDE Project',
    status:          p.status          || p.health || 'On Track',
    currentPhase:    p.currentPhase    || p.phase  || null,
    owner:           p.owner           || null,
    startedAt:       asIso(p.startedAt || p.startDate),
    targetDate:      asIso(p.targetDate || p.releaseDate || p.dueDate),
    percentComplete: Number(p.percentComplete ?? p.progress ?? 0),
    summary:         p.summary         || p.description || '',
    _raw:            raw,
  };
}

// Map docs.json section IDs / phase names to command-name fragments
const PHASE_COMMAND_MAP: Record<string, string[]> = {
  'project-initiation':  ['init', 'setup', 'configuration'],
  'business-analysis':   ['business_analysis', 'business_functions', 'use_cases', 'perform_business'],
  'system-design':       ['system_design', 'build_system', 'generate_ldm', 'generate_glossary', 'generate_diagrams'],
  'modules':             ['generate_modules', 'module_definition'],
  'development':         ['generate_source', 'generate_ui', 'setup_dev', 'generate_sql',
                          'database_init', 'seed_data', 'generate_sample'],
};

function phaseStatusFromCommands(sectionId: string, completedCmds: string[], failedCmds: string[], currentPhase: string): string {
  const fragments = PHASE_COMMAND_MAP[sectionId] || [];
  const isCompleted = fragments.some(f => completedCmds.some(c => c.includes(f)));
  const isFailed    = fragments.some(f => failedCmds.some(c => c.includes(f)));
  const isCurrent   = currentPhase && (
    sectionId === currentPhase ||
    sectionId.replace(/-/g, '_') === currentPhase ||
    currentPhase.startsWith(sectionId.replace(/-/g, '_').slice(0, 8))
  );

  if (isFailed)    return 'blocked';
  if (isCompleted) return 'done';
  if (isCurrent)   return 'in_progress';
  return 'not_started';
}

function normalizeManifestPhases(manifest: any, projectState: any): AnyObj[] {
  const sections       = manifest?.sections || [];
  const completedCmds: string[] = projectState?.completed_commands || [];
  const failedCmds:    string[] = Array.isArray(projectState?.failed_commands)
    ? projectState.failed_commands
    : Object.keys(projectState?.failed_commands || {});
  const currentPhase   = projectState?.current_phase || '';

  return sections.map((section: any, index: number) => {
    const status     = phaseStatusFromCommands(section.id, completedCmds, failedCmds, currentPhase);
    const itemCount  = (section.items || []).length;
    const pct        = status === 'done' ? 100 : status === 'in_progress' ? 50 : 0;
    return {
      id:                `phase-${index + 1}`,
      name:              section.label || section.id,
      order:             index + 1,
      status,
      percentComplete:   pct,
      owner:             null,
      notes:             '',
      taskCount:         itemCount,
      completedTaskCount: status === 'done' ? itemCount : 0,
      artifactCount:     0,
      blockerCount:      status === 'blocked' ? 1 : 0,
    };
  });
}

function normalizePhases(raw: any): AnyObj[] {
  const defaults = ['Intake','Analyze','Model','Generate','Review','Validate','Release','Monitor'];
  const phases = pickArray(raw, ['phases','items','data']);
  if (!phases.length) {
    return defaults.map((name, i) => ({
      id: `phase-${i+1}`, name, order: i+1, status: 'not_started', percentComplete: 0,
    }));
  }
  return phases.map((item: any, i: number) => ({
    id:              item.id  || `phase-${i+1}`,
    name:            item.name || item.phase || defaults[i] || `Phase ${i+1}`,
    order:           Number(item.order ?? i+1),
    status:          String(item.status || 'not_started').toLowerCase(),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    owner:           item.owner  || null,
    notes:           item.notes  || '',
  })).sort((a: AnyObj, b: AnyObj) => a.order - b.order);
}

function normalizeTasks(raw: any): AnyObj[] {
  const tasks = pickArray(raw, ['tasks','items','workItems','data']);
  return tasks.map((item: any, i: number) => ({
    id:              item.id       || `task-${i+1}`,
    title:           item.title    || item.name || `Task ${i+1}`,
    phase:           item.phase    || item.phaseName || null,
    status:          String(item.status || 'todo').toLowerCase(),
    priority:        String(item.priority || 'medium').toLowerCase(),
    owner:           item.owner    || null,
    dueDate:         asIso(item.dueDate || item.targetDate),
    updatedAt:       asIso(item.updatedAt || item.modifiedAt),
    blocked:         Boolean(item.blocked || item.isBlocked),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    recommendation:  item.recommendation || item.suggestedAction || null,
    detail:          item.detail   || item.description || '',
  }));
}

// Derive artifacts from project-state.json { artifacts: { "path": "status" } }
function normalizeArtifactsFromProjectState(projectState: any): AnyObj[] {
  const arts = projectState?.artifacts;
  if (!arts || typeof arts !== 'object' || Array.isArray(arts)) return [];
  return Object.entries(arts).map(([filePath, status], i) => {
    const name = path.basename(filePath);
    const ext  = path.extname(name).slice(1);
    const dir  = path.dirname(filePath).split('/')[0] || '';
    const phaseMap: Record<string, string> = {
      ba: 'Business Analysis', design: 'System Design',
      src: 'Development', ui: 'Development', test: 'Development',
    };
    return {
      id:        `artifact-${i+1}`,
      name,
      type:      ext || 'file',
      phase:     phaseMap[dir] || dir || null,
      status:    String(status || 'draft').toLowerCase(),
      owner:     null,
      updatedAt: null,
      link:      filePath,
      version:   null,
      summary:   '',
    };
  });
}

function normalizeArtifacts(raw: any): AnyObj[] {
  const items = pickArray(raw, ['artifacts','items','outputs','data']);
  return items.map((item: any, i: number) => ({
    id:        item.id      || `artifact-${i+1}`,
    name:      item.name    || item.title || `Artifact ${i+1}`,
    type:      item.type    || item.kind  || 'file',
    phase:     item.phase   || item.phaseName || null,
    status:    String(item.status || 'draft').toLowerCase(),
    owner:     item.owner   || null,
    updatedAt: asIso(item.updatedAt || item.modifiedAt),
    link:      item.link    || item.url  || null,
    version:   item.version || null,
    summary:   item.summary || '',
  }));
}

// Derive blockers from project-state.json failed_commands
function normalizeBlockersFromProjectState(projectState: any): AnyObj[] {
  const failed = projectState?.failed_commands;
  if (!failed) return [];
  const entries: [string, any][] = Array.isArray(failed)
    ? failed.map((c: string) => [c, 'failed'])
    : Object.entries(failed);
  return entries.map(([cmd, detail], i) => ({
    id:        `blocker-${i+1}`,
    title:     `Failed command: ${cmd}`,
    severity:  'high',
    phase:     null,
    status:    'open',
    owner:     null,
    createdAt: null,
    detail:    typeof detail === 'string' ? detail : JSON.stringify(detail),
    resolution: null,
  }));
}

function normalizeBlockers(raw: any): AnyObj[] {
  const items = pickArray(raw, ['blockers','items','issues','data']);
  return items.map((item: any, i: number) => ({
    id:         item.id       || `blocker-${i+1}`,
    title:      item.title    || item.name || `Blocker ${i+1}`,
    severity:   String(item.severity || 'medium').toLowerCase(),
    phase:      item.phase    || item.phaseName || null,
    status:     String(item.status || 'open').toLowerCase(),
    owner:      item.owner    || null,
    createdAt:  asIso(item.createdAt),
    detail:     item.detail   || item.description || '',
    resolution: item.resolution || null,
  }));
}

// Normalize activity from command-log.jsonl entries
function normalizeActivityFromCommandLog(entries: AnyObj[]): AnyObj[] {
  return entries.map((entry: any, i: number) => ({
    id:     `activity-${i+1}`,
    type:   'command',
    title:  entry.label  || entry.command || `Command ${i+1}`,
    actor:  entry.ai     ? 'AI' : 'user',
    phase:  null,
    at:     asIso(entry.ran_at || entry.timestamp),
    detail: entry.note   || entry.status || '',
  })).sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function normalizeActivity(raw: any): AnyObj[] {
  const items = pickArray(raw, ['activity','items','events','timeline','data']);
  return items.map((item: any, i: number) => ({
    id:     item.id    || `activity-${i+1}`,
    type:   item.type  || 'event',
    title:  item.title || item.message || `Activity ${i+1}`,
    actor:  item.actor || item.user || null,
    phase:  item.phase || null,
    at:     asIso(item.at || item.timestamp || item.createdAt),
    detail: item.detail || '',
  })).sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function normalizeDecisions(raw: any): AnyObj[] {
  const items = pickArray(raw, ['decisions','items','approvals','data']);
  return items.map((item: any, i: number) => ({
    id:      item.id     || `decision-${i+1}`,
    title:   item.title  || item.name   || item.question || `Decision ${i+1}`,
    phase:   item.phase  || null,
    status:  String(item.status || (item.answer ? 'approved' : 'pending')).toLowerCase(),
    owner:   item.owner  || null,
    dueDate: asIso(item.dueDate),
    madeAt:  asIso(item.madeAt || item.decidedAt || item.answeredAt),
    detail:  item.detail || item.description || item.answer || '',
  }));
}

// ── Phase enrichment ───────────────────────────────────────────────────────────

function enrichPhases(phases: AnyObj[], tasks: AnyObj[], artifacts: AnyObj[], blockers: AnyObj[]): AnyObj[] {
  return phases.map(phase => {
    const name             = phase.name;
    const phaseTasks       = tasks.filter(t => t.phase === name);
    const phaseArtifacts   = artifacts.filter(a => a.phase === name);
    const phaseBlockers    = blockers.filter(b => b.phase === name && !['resolved','closed'].includes(b.status));
    const completedCount   = phaseTasks.filter(t => ['done','completed'].includes(t.status)).length;
    const taskCount        = phaseTasks.length;
    const pct              = phase.percentComplete || (taskCount ? Math.round(completedCount / taskCount * 100) : 0);
    return {
      ...phase,
      taskCount:          phase.taskCount         ?? taskCount,
      completedTaskCount: phase.completedTaskCount ?? completedCount,
      artifactCount:      phase.artifactCount      ?? phaseArtifacts.length,
      blockerCount:       phase.blockerCount       ?? phaseBlockers.length,
      percentComplete:    clamp(pct, 0, 100),
    };
  });
}

function currentPhase(project: AnyObj, phases: AnyObj[]): AnyObj | null {
  return phases.find(p => p.name === project.currentPhase)
    || phases.find(p => p.name?.toLowerCase().replace(/\s+/g,'_') === project.currentPhase?.toLowerCase())
    || phases.find(p => p.status === 'in_progress')
    || phases.find(p => p.status === 'blocked')
    || phases[0]
    || null;
}

function overallCompletion(project: AnyObj, phases: AnyObj[], tasks: AnyObj[]): number {
  if (project.percentComplete > 0) return clamp(project.percentComplete, 0, 100);
  if (tasks.length) {
    const done = tasks.filter(t => ['done','completed'].includes(t.status)).length;
    return Math.round(done / tasks.length * 100);
  }
  if (phases.length) return Math.round(phases.reduce((s, p) => s + Number(p.percentComplete || 0), 0) / phases.length);
  return 0;
}

function overallStatus(project: AnyObj, blockers: AnyObj[], phases: AnyObj[]): string {
  if (blockers.some(b => ['high','critical'].includes(b.severity) && !['resolved','closed'].includes(b.status))) return 'Blocked';
  if (phases.some(p => p.status === 'blocked')) return 'Blocked';
  if (phases.some(p => p.status === 'at_risk'))  return 'At Risk';
  return String(project.status || 'On Track');
}

function lastActivity(activity: AnyObj[], artifacts: AnyObj[], tasks: AnyObj[]): AnyObj | null {
  const candidates: AnyObj[] = [];
  activity.forEach(a  => a.at         && candidates.push({ label: a.title,                        at: a.at }));
  artifacts.forEach(a => a.updatedAt  && candidates.push({ label: `Artifact: ${a.name}`,          at: a.updatedAt }));
  tasks.forEach(t     => t.updatedAt  && candidates.push({ label: `Task updated: ${t.title}`,     at: t.updatedAt }));
  candidates.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  return candidates[0] || null;
}

function sortByPriority(a: AnyObj, b: AnyObj): number {
  const score: Record<string, number> = { critical:4, high:3, medium:2, low:1 };
  return (score[b.priority] || 0) - (score[a.priority] || 0);
}

function workBuckets(tasks: AnyObj[]): AnyObj {
  return {
    done:      tasks.filter(t => ['done','completed'].includes(t.status)).sort(sortByPriority).slice(0, 8),
    next:      tasks.filter(t => ['todo','ready','next','in_progress'].includes(t.status) && !t.blocked).sort(sortByPriority).slice(0, 8),
    attention: tasks.filter(t => t.blocked || ['blocked','at_risk'].includes(t.status)).sort(sortByPriority).slice(0, 8),
  };
}

function recommendNextAction(phase: AnyObj | null, tasks: AnyObj[], blockers: AnyObj[], decisions: AnyObj[]): AnyObj {
  const blocker = blockers.find(b => ['critical','high'].includes(b.severity) && !['resolved','closed'].includes(b.status));
  if (blocker) return {
    type: 'resolve_blocker', title: `Resolve blocker: ${blocker.title}`,
    why: 'A high-severity blocker is preventing progress.', unlocks: phase?.name || 'Workflow progress',
    target: { entity: 'blocker', id: blocker.id },
  };
  const decision = decisions.find(d => d.status === 'pending');
  if (decision) return {
    type: 'make_decision', title: `Decision needed: ${decision.title}`,
    why: 'A pending decision is delaying downstream work.', unlocks: decision.phase || phase?.name || 'Downstream work',
    target: { entity: 'decision', id: decision.id },
  };
  const task = tasks.filter(t => !t.blocked && ['next','ready','todo','in_progress'].includes(t.status)).sort(sortByPriority)[0];
  if (task) return {
    type: 'execute_task', title: task.title,
    why: 'This is the highest-value available work item.', unlocks: task.phase || phase?.name || 'Next phase progress',
    target: { entity: 'task', id: task.id },
  };
  return {
    type: 'review_status', title: 'Review dashboard status',
    why: 'No obvious next action was found from the current data.', unlocks: 'A clearer workflow decision',
    target: null,
  };
}

function traceability(phases: AnyObj[], tasks: AnyObj[], artifacts: AnyObj[], blockers: AnyObj[], activity: AnyObj[], decisions: AnyObj[]): AnyObj {
  return {
    recentActivity:   activity.slice(0, 12),
    openBlockers:     blockers.filter(b => !['resolved','closed'].includes(b.status)).slice(0, 10),
    pendingDecisions: decisions.filter(d => d.status === 'pending').slice(0, 10),
    artifactLinks:    artifacts.slice(0, 20),
    phaseChecklist:   phases.map(phase => ({
      phase:          phase.name,
      completedTasks: tasks.filter(t => t.phase === phase.name && ['done','completed'].includes(t.status)).length,
      totalTasks:     tasks.filter(t => t.phase === phase.name).length,
      artifactCount:  artifacts.filter(a => a.phase === phase.name).length,
      blockerCount:   blockers.filter(b => b.phase === phase.name && !['resolved','closed'].includes(b.status)).length,
    })),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function resolveDashboardFiles(docsRoot: string, config: AnyObj): DashboardFileConfig {
  const d   = config.dashboard   || {};
  const ps  = config.project_state || {};
  const join = (p?: string): string | undefined => p ? path.join(docsRoot, p) : undefined;

  // Find manifest (docs.json or view.json) for phases
  const manifestPath = join(d.manifest)
    || ['docs/docs.json', 'docs/view.json', 'view.json', 'docs.json']
        .map(n => path.join(docsRoot, n))
        .find(p => fs.existsSync(p));

  // Prefer project-state.json for project / artifacts / blockers
  const projectStatePath = join(d.project) || join(ps.state);

  return {
    _projectName: config.project?.name,
    project:      projectStatePath || path.join(docsRoot, 'project/project-state.json'),
    phases:       join(d.phases)   || manifestPath || path.join(docsRoot, 'data/dashboard/phases.json'),
    tasks:        join(d.tasks)    || join(ps.openQueue)  || path.join(docsRoot, 'data/dashboard/tasks.json'),
    artifacts:    join(d.artifacts)|| projectStatePath    || path.join(docsRoot, 'data/dashboard/artifacts.json'),
    blockers:     join(d.blockers) || projectStatePath    || path.join(docsRoot, 'data/dashboard/blockers.json'),
    activity:     join(d.activity) || join(ps.commandLog) || path.join(docsRoot, 'data/dashboard/activity.json'),
    decisions:    join(d.decisions)|| join(ps.questions)  || path.join(docsRoot, 'data/dashboard/decisions.json'),
  };
}

export function buildDashboardData(fileConfig: DashboardFileConfig): AnyObj {
  const projectRaw = readJsonSafe(fileConfig.project, {});

  // ── phases: manifest sections or dedicated file ──────────────────────────────
  const phasesRaw = readJsonSafe(fileConfig.phases, null);
  let phases: AnyObj[];
  if (phasesRaw?.sections) {
    // docs.json / view.json manifest — derive phases from sections + project state
    phases = normalizeManifestPhases(phasesRaw, projectRaw);
  } else {
    phases = normalizePhases(phasesRaw);
  }

  // ── tasks ────────────────────────────────────────────────────────────────────
  const tasks = normalizeTasks(readJsonSafe(fileConfig.tasks, { tasks: [] }));

  // ── artifacts: project-state or dedicated file ───────────────────────────────
  const artifactsRaw = readJsonSafe(fileConfig.artifacts, null);
  const artifacts = artifactsRaw?.artifacts && typeof artifactsRaw.artifacts === 'object' && !Array.isArray(artifactsRaw.artifacts)
    ? normalizeArtifactsFromProjectState(artifactsRaw)
    : normalizeArtifacts(artifactsRaw || { artifacts: [] });

  // ── blockers: project-state failed_commands or dedicated file ────────────────
  const blockersRaw = readJsonSafe(fileConfig.blockers, null);
  const blockers = (blockersRaw?.failed_commands !== undefined)
    ? normalizeBlockersFromProjectState(blockersRaw)
    : normalizeBlockers(blockersRaw || { blockers: [] });

  // ── activity: .jsonl command log or JSON file ─────────────────────────────────
  const isJsonl = fileConfig.activity?.endsWith('.jsonl');
  const activity = isJsonl
    ? normalizeActivityFromCommandLog(readJsonlSafe(fileConfig.activity))
    : normalizeActivity(readJsonSafe(fileConfig.activity, { activity: [] }));

  // ── decisions ────────────────────────────────────────────────────────────────
  const decisions = normalizeDecisions(readJsonSafe(fileConfig.decisions, { decisions: [] }));

  // ── project summary ───────────────────────────────────────────────────────────
  const project = normalizeProject(projectRaw, fileConfig._projectName);

  // ── enrich phases with cross-entity counts ───────────────────────────────────
  const enrichedPhases = enrichPhases(phases, tasks, artifacts, blockers);
  const phase          = currentPhase(project, enrichedPhases);

  return {
    generatedAt: new Date().toISOString(),
    files: fileConfig,
    summary: {
      projectId:        project.id,
      projectName:      project.name,
      currentPhase:     phase?.name || null,
      overallCompletion: overallCompletion(project, enrichedPhases, tasks),
      status:           overallStatus(project, blockers, enrichedPhases),
      lastActivity:     lastActivity(activity, artifacts, tasks),
      pendingApprovals: decisions.filter(d => d.status === 'pending').length,
      blockers:         blockers.filter(b => !['resolved','closed'].includes(b.status)).length,
      owner:            project.owner,
      startedAt:        project.startedAt,
      targetDate:       project.targetDate,
      daysRemaining:    daysRemaining(project.targetDate),
      description:      project.summary,
    },
    phases:      enrichedPhases,
    work:        workBuckets(tasks),
    nextAction:  recommendNextAction(phase, tasks, blockers, decisions),
    artifacts,
    blockers,
    decisions,
    traceability: traceability(enrichedPhases, tasks, artifacts, blockers, activity, decisions),
  };
}

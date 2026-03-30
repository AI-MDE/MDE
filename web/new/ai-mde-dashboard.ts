import * as fs from 'fs';
import * as path from 'path';

type AnyObj = Record<string, any>;

export interface DashboardFileConfig {
  project?: string;
  phases?: string;
  tasks?: string;
  artifacts?: string;
  blockers?: string;
  activity?: string;
  decisions?: string;
}

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

function pickArray(source: AnyObj | undefined, keys: string[]): AnyObj[] {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
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
  const now = new Date();
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function normalizeProject(raw: any): AnyObj {
  const p = raw?.project || raw || {};
  return {
    id: p.id || p.projectId || 'project-1',
    name: p.name || p.projectName || 'AI-MDE Project',
    status: p.status || p.health || 'On Track',
    currentPhase: p.currentPhase || p.phase || null,
    owner: p.owner || null,
    startedAt: asIso(p.startedAt || p.startDate),
    targetDate: asIso(p.targetDate || p.releaseDate || p.dueDate),
    percentComplete: Number(p.percentComplete ?? p.progress ?? 0),
    summary: p.summary || p.description || ''
  };
}

function normalizePhases(raw: any): AnyObj[] {
  const defaults = ['Intake', 'Analyze', 'Model', 'Generate', 'Review', 'Validate', 'Release', 'Monitor'];
  const phases = pickArray(raw, ['phases', 'items', 'data']);
  if (!phases.length) {
    return defaults.map((name, index) => ({
      id: `phase-${index + 1}`,
      name,
      order: index + 1,
      status: 'not_started',
      percentComplete: 0
    }));
  }
  return phases.map((item, index) => ({
    id: item.id || `phase-${index + 1}`,
    name: item.name || item.phase || defaults[index] || `Phase ${index + 1}`,
    order: Number(item.order ?? index + 1),
    status: String(item.status || 'not_started').toLowerCase(),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    owner: item.owner || null,
    notes: item.notes || ''
  })).sort((a, b) => a.order - b.order);
}

function normalizeTasks(raw: any): AnyObj[] {
  const tasks = pickArray(raw, ['tasks', 'items', 'workItems', 'data']);
  return tasks.map((item, index) => ({
    id: item.id || `task-${index + 1}`,
    title: item.title || item.name || `Task ${index + 1}`,
    phase: item.phase || item.phaseName || null,
    status: String(item.status || 'todo').toLowerCase(),
    priority: String(item.priority || 'medium').toLowerCase(),
    owner: item.owner || null,
    dueDate: asIso(item.dueDate || item.targetDate),
    updatedAt: asIso(item.updatedAt || item.modifiedAt),
    blocked: Boolean(item.blocked || item.isBlocked),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    recommendation: item.recommendation || item.suggestedAction || null,
    detail: item.detail || item.description || ''
  }));
}

function normalizeArtifacts(raw: any): AnyObj[] {
  const items = pickArray(raw, ['artifacts', 'items', 'outputs', 'data']);
  return items.map((item, index) => ({
    id: item.id || `artifact-${index + 1}`,
    name: item.name || item.title || `Artifact ${index + 1}`,
    type: item.type || item.kind || 'file',
    phase: item.phase || item.phaseName || null,
    status: String(item.status || 'draft').toLowerCase(),
    owner: item.owner || null,
    updatedAt: asIso(item.updatedAt || item.modifiedAt),
    link: item.link || item.url || null,
    version: item.version || null,
    summary: item.summary || ''
  }));
}

function normalizeBlockers(raw: any): AnyObj[] {
  const items = pickArray(raw, ['blockers', 'items', 'issues', 'data']);
  return items.map((item, index) => ({
    id: item.id || `blocker-${index + 1}`,
    title: item.title || item.name || `Blocker ${index + 1}`,
    severity: String(item.severity || 'medium').toLowerCase(),
    phase: item.phase || item.phaseName || null,
    status: String(item.status || 'open').toLowerCase(),
    owner: item.owner || null,
    createdAt: asIso(item.createdAt),
    detail: item.detail || item.description || '',
    resolution: item.resolution || null
  }));
}

function normalizeActivity(raw: any): AnyObj[] {
  const items = pickArray(raw, ['activity', 'items', 'events', 'timeline', 'data']);
  return items.map((item, index) => ({
    id: item.id || `activity-${index + 1}`,
    type: item.type || 'event',
    title: item.title || item.message || `Activity ${index + 1}`,
    actor: item.actor || item.user || null,
    phase: item.phase || null,
    at: asIso(item.at || item.timestamp || item.createdAt),
    detail: item.detail || ''
  })).sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function normalizeDecisions(raw: any): AnyObj[] {
  const items = pickArray(raw, ['decisions', 'items', 'approvals', 'data']);
  return items.map((item, index) => ({
    id: item.id || `decision-${index + 1}`,
    title: item.title || item.name || `Decision ${index + 1}`,
    phase: item.phase || null,
    status: String(item.status || 'pending').toLowerCase(),
    owner: item.owner || null,
    dueDate: asIso(item.dueDate),
    madeAt: asIso(item.madeAt || item.decidedAt),
    detail: item.detail || item.description || ''
  }));
}

function enrichPhases(phases: AnyObj[], tasks: AnyObj[], artifacts: AnyObj[], blockers: AnyObj[]): AnyObj[] {
  return phases.map((phase) => {
    const name = phase.name;
    const phaseTasks = tasks.filter(t => t.phase === name);
    const phaseArtifacts = artifacts.filter(a => a.phase === name);
    const phaseBlockers = blockers.filter(b => b.phase === name && !['resolved', 'closed'].includes(b.status));
    const completedTaskCount = phaseTasks.filter(t => ['done', 'completed'].includes(t.status)).length;
    const taskCount = phaseTasks.length;
    const percentComplete = phase.percentComplete || (taskCount ? Math.round(completedTaskCount / taskCount * 100) : 0);
    return {
      ...phase,
      taskCount,
      completedTaskCount,
      artifactCount: phaseArtifacts.length,
      blockerCount: phaseBlockers.length,
      percentComplete: clamp(percentComplete, 0, 100)
    };
  });
}

function currentPhase(project: AnyObj, phases: AnyObj[]): AnyObj | null {
  return phases.find(p => p.name === project.currentPhase)
    || phases.find(p => p.status === 'in_progress')
    || phases.find(p => p.status === 'blocked')
    || phases[0]
    || null;
}

function overallCompletion(project: AnyObj, phases: AnyObj[], tasks: AnyObj[]): number {
  if (project.percentComplete > 0) return clamp(project.percentComplete, 0, 100);
  if (tasks.length) {
    const done = tasks.filter(t => ['done', 'completed'].includes(t.status)).length;
    return Math.round(done / tasks.length * 100);
  }
  if (phases.length) return Math.round(phases.reduce((sum, p) => sum + Number(p.percentComplete || 0), 0) / phases.length);
  return 0;
}

function overallStatus(project: AnyObj, blockers: AnyObj[], phases: AnyObj[]): string {
  if (blockers.some(b => ['high', 'critical'].includes(b.severity) && !['resolved', 'closed'].includes(b.status))) return 'Blocked';
  if (phases.some(p => p.status === 'blocked')) return 'Blocked';
  if (phases.some(p => p.status === 'at_risk')) return 'At Risk';
  return String(project.status || 'On Track');
}

function lastActivity(activity: AnyObj[], artifacts: AnyObj[], tasks: AnyObj[]): AnyObj | null {
  const candidates: AnyObj[] = [];
  activity.forEach(a => a.at && candidates.push({ label: a.title, at: a.at }));
  artifacts.forEach(a => a.updatedAt && candidates.push({ label: `Artifact updated: ${a.name}`, at: a.updatedAt }));
  tasks.forEach(t => t.updatedAt && candidates.push({ label: `Task updated: ${t.title}`, at: t.updatedAt }));
  candidates.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  return candidates[0] || null;
}

function sortByPriority(a: AnyObj, b: AnyObj): number {
  const score: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return (score[b.priority] || 0) - (score[a.priority] || 0);
}

function workBuckets(tasks: AnyObj[]): AnyObj {
  return {
    done: tasks.filter(t => ['done', 'completed'].includes(t.status)).sort(sortByPriority).slice(0, 8),
    next: tasks.filter(t => ['todo', 'ready', 'next', 'in_progress'].includes(t.status) && !t.blocked).sort(sortByPriority).slice(0, 8),
    attention: tasks.filter(t => t.blocked || ['blocked', 'at_risk'].includes(t.status)).sort(sortByPriority).slice(0, 8)
  };
}

function recommendNextAction(phase: AnyObj | null, tasks: AnyObj[], blockers: AnyObj[], decisions: AnyObj[]): AnyObj {
  const blocker = blockers.find(b => ['critical', 'high'].includes(b.severity) && !['resolved', 'closed'].includes(b.status));
  if (blocker) {
    return {
      type: 'resolve_blocker',
      title: `Resolve blocker: ${blocker.title}`,
      why: 'A high-severity blocker is preventing progress.',
      unlocks: phase?.name || 'Workflow progress',
      target: { entity: 'blocker', id: blocker.id }
    };
  }
  const decision = decisions.find(d => d.status === 'pending');
  if (decision) {
    return {
      type: 'make_decision',
      title: `Decision needed: ${decision.title}`,
      why: 'A pending decision is delaying downstream work.',
      unlocks: decision.phase || phase?.name || 'Downstream work',
      target: { entity: 'decision', id: decision.id }
    };
  }
  const task = tasks.filter(t => !t.blocked && ['next', 'ready', 'todo', 'in_progress'].includes(t.status)).sort(sortByPriority)[0];
  if (task) {
    return {
      type: 'execute_task',
      title: task.title,
      why: 'This is the highest-value available work item.',
      unlocks: task.phase || phase?.name || 'Next phase progress',
      target: { entity: 'task', id: task.id }
    };
  }
  return {
    type: 'review_status',
    title: 'Review dashboard status',
    why: 'No obvious next action was found from the current data.',
    unlocks: 'A clearer workflow decision',
    target: null
  };
}

function traceability(phases: AnyObj[], tasks: AnyObj[], artifacts: AnyObj[], blockers: AnyObj[], activity: AnyObj[], decisions: AnyObj[]): AnyObj {
  return {
    recentActivity: activity.slice(0, 12),
    openBlockers: blockers.filter(b => !['resolved', 'closed'].includes(b.status)).slice(0, 10),
    pendingDecisions: decisions.filter(d => d.status === 'pending').slice(0, 10),
    artifactLinks: artifacts.slice(0, 20),
    phaseChecklist: phases.map(phase => ({
      phase: phase.name,
      completedTasks: tasks.filter(t => t.phase === phase.name && ['done', 'completed'].includes(t.status)).length,
      totalTasks: tasks.filter(t => t.phase === phase.name).length,
      artifactCount: artifacts.filter(a => a.phase === phase.name).length,
      blockerCount: blockers.filter(b => b.phase === phase.name && !['resolved', 'closed'].includes(b.status)).length
    }))
  };
}

export function resolveDashboardFiles(docsRoot: string, config: AnyObj): DashboardFileConfig {
  const d = config.dashboard || {};
  const join = (p?: string): string | undefined => p ? path.join(docsRoot, p) : undefined;
  return {
    project: join(d.project) || path.join(docsRoot, 'data/dashboard/project.json'),
    phases: join(d.phases) || path.join(docsRoot, 'data/dashboard/phases.json'),
    tasks: join(d.tasks) || path.join(docsRoot, 'data/dashboard/tasks.json'),
    artifacts: join(d.artifacts) || path.join(docsRoot, 'data/dashboard/artifacts.json'),
    blockers: join(d.blockers) || path.join(docsRoot, 'data/dashboard/blockers.json'),
    activity: join(d.activity) || path.join(docsRoot, 'data/dashboard/activity.json'),
    decisions: join(d.decisions) || path.join(docsRoot, 'data/dashboard/decisions.json')
  };
}

export function buildDashboardData(fileConfig: DashboardFileConfig): AnyObj {
  const project = normalizeProject(readJsonSafe(fileConfig.project, {}));
  const tasks = normalizeTasks(readJsonSafe(fileConfig.tasks, { tasks: [] }));
  const artifacts = normalizeArtifacts(readJsonSafe(fileConfig.artifacts, { artifacts: [] }));
  const blockers = normalizeBlockers(readJsonSafe(fileConfig.blockers, { blockers: [] }));
  const activity = normalizeActivity(readJsonSafe(fileConfig.activity, { activity: [] }));
  const decisions = normalizeDecisions(readJsonSafe(fileConfig.decisions, { decisions: [] }));
  const phases = enrichPhases(normalizePhases(readJsonSafe(fileConfig.phases, { phases: [] })), tasks, artifacts, blockers);
  const phase = currentPhase(project, phases);
  return {
    generatedAt: new Date().toISOString(),
    files: fileConfig,
    summary: {
      projectId: project.id,
      projectName: project.name,
      currentPhase: phase?.name || null,
      overallCompletion: overallCompletion(project, phases, tasks),
      status: overallStatus(project, blockers, phases),
      lastActivity: lastActivity(activity, artifacts, tasks),
      pendingApprovals: decisions.filter(d => d.status === 'pending').length,
      blockers: blockers.filter(b => !['resolved', 'closed'].includes(b.status)).length,
      owner: project.owner,
      startedAt: project.startedAt,
      targetDate: project.targetDate,
      daysRemaining: daysRemaining(project.targetDate),
      description: project.summary
    },
    phases,
    work: workBuckets(tasks),
    nextAction: recommendNextAction(phase, tasks, blockers, decisions),
    artifacts,
    blockers,
    decisions,
    traceability: traceability(phases, tasks, artifacts, blockers, activity, decisions)
  };
}

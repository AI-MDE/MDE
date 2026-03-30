'use strict';

/**
 * AI-MDE Dashboard Data Builder
 *
 * Purpose:
 * - Read dashboard-related data from multiple JSON files
 * - Normalize inconsistent shapes
 * - Produce a single payload for the frontend dashboard
 *
 * Usage:
 *    *   const { createDashboardRouter, buildDashboardData } = require('./ai-mde-dashboard-data');
 *
 *   const app = express();
 *   app.use('/api/dashboard', createDashboardRouter({
 *     config: {
 *       project: './data/project.json',
 *       phases: './data/phases.json',
 *       tasks: './data/tasks.json',
 *       artifacts: './data/artifacts.json',
 *       blockers: './data/blockers.json',
 *       activity: './data/activity.json',
 *       decisions: './data/decisions.json'
 *     }
 *   }));
 *
 *   app.listen(3000);
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PHASES = [
  'Intake',
  'Analyze',
  'Model',
  'Generate',
  'Review',
  'Validate',
  'Release',
  'Monitor'
];

function readJsonSafe(filePath, fallback) {
  try {
    if (!filePath) return fallback;
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return fallback;
    const raw = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {
      __readError: true,
      message: error.message,
      fallback
    };
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function pickArray(source, keys) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function pickObject(source, keys, fallback = {}) {
  for (const key of keys) {
    if (source?.[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      return source[key];
    }
  }
  return fallback;
}

function toDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function iso(value) {
  const date = toDateValue(value);
  return date ? date.toISOString() : null;
}

function daysBetween(a, b) {
  const d1 = toDateValue(a);
  const d2 = toDateValue(b);
  if (!d1 || !d2) return null;
  const diff = d2.getTime() - d1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeProject(raw) {
  const source = raw?.project || raw || {};
  return {
    id: source.id || source.projectId || 'project-1',
    name: source.name || source.projectName || 'AI-MDE Project',
    status: source.status || source.health || 'On Track',
    currentPhase: source.currentPhase || source.phase || null,
    owner: source.owner || null,
    startedAt: iso(source.startedAt || source.startDate),
    targetDate: iso(source.targetDate || source.releaseDate || source.dueDate),
    percentComplete: Number(source.percentComplete ?? source.progress ?? 0),
    summary: source.summary || source.description || '',
    metrics: {
      totalItems: Number(source.totalItems ?? 0),
      completedItems: Number(source.completedItems ?? 0),
      pendingApprovals: Number(source.pendingApprovals ?? 0),
      blockers: Number(source.blockers ?? 0)
    }
  };
}

function normalizePhases(raw) {
  const phases = pickArray(raw, ['phases', 'items', 'data']);

  if (!phases.length) {
    return DEFAULT_PHASES.map((name, index) => ({
      id: `phase-${index + 1}`,
      name,
      order: index + 1,
      status: 'not_started',
      percentComplete: 0,
      artifactCount: 0,
      blockerCount: 0,
      taskCount: 0,
      completedTaskCount: 0,
      nextAction: null,
      startedAt: null,
      completedAt: null,
      owner: null,
      notes: ''
    }));
  }

  return phases.map((item, index) => ({
    id: item.id || `phase-${index + 1}`,
    name: item.name || item.phase || DEFAULT_PHASES[index] || `Phase ${index + 1}`,
    order: Number(item.order ?? index + 1),
    status: (item.status || 'not_started').toLowerCase(),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    artifactCount: Number(item.artifactCount ?? item.artifacts ?? 0),
    blockerCount: Number(item.blockerCount ?? item.blockers ?? 0),
    taskCount: Number(item.taskCount ?? item.tasks ?? 0),
    completedTaskCount: Number(item.completedTaskCount ?? item.completedTasks ?? 0),
    nextAction: item.nextAction || null,
    startedAt: iso(item.startedAt || item.startDate),
    completedAt: iso(item.completedAt || item.endDate),
    owner: item.owner || null,
    notes: item.notes || ''
  })).sort((a, b) => a.order - b.order);
}

function normalizeTasks(raw) {
  const tasks = pickArray(raw, ['tasks', 'items', 'workItems', 'data']);
  return tasks.map((item, index) => ({
    id: item.id || `task-${index + 1}`,
    title: item.title || item.name || `Task ${index + 1}`,
    phase: item.phase || item.phaseName || null,
    status: (item.status || 'todo').toLowerCase(),
    priority: (item.priority || 'medium').toLowerCase(),
    owner: item.owner || null,
    dueDate: iso(item.dueDate || item.targetDate),
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
    percentComplete: clamp(Number(item.percentComplete ?? item.progress ?? 0), 0, 100),
    blocked: Boolean(item.blocked || item.isBlocked),
    blockerIds: asArray(item.blockerIds),
    artifactIds: asArray(item.artifactIds),
    recommendation: item.recommendation || item.suggestedAction || null,
    detail: item.detail || item.description || ''
  }));
}

function normalizeArtifacts(raw) {
  const artifacts = pickArray(raw, ['artifacts', 'items', 'outputs', 'data']);
  return artifacts.map((item, index) => ({
    id: item.id || `artifact-${index + 1}`,
    name: item.name || item.title || `Artifact ${index + 1}`,
    type: item.type || item.kind || 'file',
    phase: item.phase || item.phaseName || null,
    status: (item.status || 'draft').toLowerCase(),
    owner: item.owner || null,
    updatedAt: iso(item.updatedAt || item.modifiedAt),
    createdAt: iso(item.createdAt),
    link: item.link || item.url || null,
    version: item.version || null,
    summary: item.summary || '',
    taskIds: asArray(item.taskIds)
  }));
}

function normalizeBlockers(raw) {
  const blockers = pickArray(raw, ['blockers', 'items', 'issues', 'data']);
  return blockers.map((item, index) => ({
    id: item.id || `blocker-${index + 1}`,
    title: item.title || item.name || `Blocker ${index + 1}`,
    severity: (item.severity || 'medium').toLowerCase(),
    phase: item.phase || item.phaseName || null,
    status: (item.status || 'open').toLowerCase(),
    owner: item.owner || null,
    createdAt: iso(item.createdAt),
    resolvedAt: iso(item.resolvedAt),
    affects: asArray(item.affects),
    detail: item.detail || item.description || '',
    resolution: item.resolution || null
  }));
}

function normalizeActivity(raw) {
  const activity = pickArray(raw, ['activity', 'items', 'events', 'timeline', 'data']);
  return activity.map((item, index) => ({
    id: item.id || `activity-${index + 1}`,
    type: item.type || 'event',
    title: item.title || item.message || `Activity ${index + 1}`,
    actor: item.actor || item.user || null,
    phase: item.phase || null,
    targetType: item.targetType || null,
    targetId: item.targetId || null,
    at: iso(item.at || item.timestamp || item.createdAt),
    detail: item.detail || ''
  })).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function normalizeDecisions(raw) {
  const decisions = pickArray(raw, ['decisions', 'items', 'approvals', 'data']);
  return decisions.map((item, index) => ({
    id: item.id || `decision-${index + 1}`,
    title: item.title || item.name || `Decision ${index + 1}`,
    phase: item.phase || null,
    status: (item.status || 'pending').toLowerCase(),
    owner: item.owner || null,
    dueDate: iso(item.dueDate),
    madeAt: iso(item.madeAt || item.decidedAt),
    detail: item.detail || item.description || ''
  }));
}

function computePhaseStats(phases, tasks, artifacts, blockers) {
  return phases.map((phase) => {
    const phaseTasks = tasks.filter(t => t.phase === phase.name);
    const phaseArtifacts = artifacts.filter(a => a.phase === phase.name);
    const phaseBlockers = blockers.filter(b => b.phase === phase.name && b.status !== 'resolved' && b.status !== 'closed');

    const completedTaskCount = phase.completedTaskCount || phaseTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    const taskCount = phase.taskCount || phaseTasks.length;
    const artifactCount = phase.artifactCount || phaseArtifacts.length;
    const blockerCount = phase.blockerCount || phaseBlockers.length;

    let percentComplete = phase.percentComplete;
    if ((!percentComplete || percentComplete === 0) && taskCount > 0) {
      percentComplete = Math.round((completedTaskCount / taskCount) * 100);
    }

    return {
      ...phase,
      taskCount,
      completedTaskCount,
      artifactCount,
      blockerCount,
      percentComplete: clamp(percentComplete, 0, 100)
    };
  });
}

function findCurrentPhase(project, phases) {
  if (project.currentPhase) {
    return phases.find(p => p.name === project.currentPhase) || null;
  }
  return phases.find(p => p.status === 'in_progress')
    || phases.find(p => p.status === 'blocked')
    || phases.find(p => p.percentComplete > 0 && p.percentComplete < 100)
    || phases[0]
    || null;
}

function computeOverallCompletion(project, phases, tasks) {
  if (project.percentComplete > 0) return clamp(project.percentComplete, 0, 100);
  if (tasks.length) {
    const done = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    return Math.round((done / tasks.length) * 100);
  }
  if (phases.length) {
    return Math.round(phases.reduce((sum, p) => sum + p.percentComplete, 0) / phases.length);
  }
  return 0;
}

function computeStatus(project, blockers, phases) {
  if ((project.metrics?.blockers || 0) > 0 || blockers.some(b => b.severity === 'high' || b.severity === 'critical')) {
    return 'Blocked';
  }
  if (phases.some(p => p.status === 'blocked')) return 'Blocked';
  if (phases.some(p => p.status === 'at_risk')) return 'At Risk';
  return project.status || 'On Track';
}

function computeLastActivity(activity, artifacts, tasks) {
  const candidates = [];
  for (const a of activity) if (a.at) candidates.push({ label: a.title, at: a.at });
  for (const a of artifacts) if (a.updatedAt) candidates.push({ label: `Artifact updated: ${a.name}`, at: a.updatedAt });
  for (const t of tasks) if (t.updatedAt) candidates.push({ label: `Task updated: ${t.title}`, at: t.updatedAt });
  candidates.sort((x, y) => new Date(y.at) - new Date(x.at));
  return candidates[0] || null;
}

function computeBuckets(tasks) {
  const done = tasks.filter(t => ['done', 'completed'].includes(t.status));
  const next = tasks.filter(t => ['todo', 'ready', 'next', 'in_progress'].includes(t.status) && !t.blocked);
  const attention = tasks.filter(t => t.blocked || ['blocked', 'at_risk'].includes(t.status));

  const sortByPriorityAndDate = (a, b) => {
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    const p = (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
    if (p !== 0) return p;
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  };

  return {
    done: done.sort(sortByPriorityAndDate).slice(0, 8),
    next: next.sort(sortByPriorityAndDate).slice(0, 8),
    attention: attention.sort(sortByPriorityAndDate).slice(0, 8)
  };
}

function recommendNextAction(project, currentPhase, tasks, blockers, decisions) {
  const openCriticalBlocker = blockers.find(b => ['critical', 'high'].includes(b.severity) && !['resolved', 'closed'].includes(b.status));
  if (openCriticalBlocker) {
    return {
      type: 'resolve_blocker',
      title: `Resolve blocker: ${openCriticalBlocker.title}`,
      why: 'A high-severity blocker is preventing progress.',
      unlocks: currentPhase ? `Progress in ${currentPhase.name}` : 'Workflow progress',
      target: { entity: 'blocker', id: openCriticalBlocker.id }
    };
  }

  const pendingDecision = decisions.find(d => d.status === 'pending');
  if (pendingDecision) {
    return {
      type: 'make_decision',
      title: `Decision needed: ${pendingDecision.title}`,
      why: 'A pending approval or decision is delaying the flow.',
      unlocks: pendingDecision.phase || 'Downstream work',
      target: { entity: 'decision', id: pendingDecision.id }
    };
  }

  const nextTask = tasks
    .filter(t => !t.blocked && ['next', 'ready', 'todo', 'in_progress'].includes(t.status))
    .sort((a, b) => {
      const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
    })[0];

  if (nextTask) {
    return {
      type: 'execute_task',
      title: nextTask.title,
      why: 'This is the highest-value available work item.',
      unlocks: nextTask.phase || currentPhase?.name || 'Next phase progress',
      target: { entity: 'task', id: nextTask.id }
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

function buildTraceability(phases, tasks, artifacts, blockers, activity, decisions) {
  return {
    recentActivity: activity.slice(0, 12),
    openBlockers: blockers.filter(b => !['resolved', 'closed'].includes(b.status)).slice(0, 10),
    pendingDecisions: decisions.filter(d => d.status === 'pending').slice(0, 10),
    artifactLinks: artifacts.slice(0, 20).map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      phase: a.phase,
      status: a.status,
      link: a.link
    })),
    phaseChecklist: phases.map(phase => ({
      phase: phase.name,
      completedTasks: tasks.filter(t => t.phase === phase.name && ['done', 'completed'].includes(t.status)).length,
      totalTasks: tasks.filter(t => t.phase === phase.name).length,
      artifactCount: artifacts.filter(a => a.phase === phase.name).length,
      blockerCount: blockers.filter(b => b.phase === phase.name && !['resolved', 'closed'].includes(b.status)).length
    }))
  };
}

function buildDashboardData(options = {}) {
  const config = options.config || {};

  const rawProject = readJsonSafe(config.project, {});
  const rawPhases = readJsonSafe(config.phases, { phases: [] });
  const rawTasks = readJsonSafe(config.tasks, { tasks: [] });
  const rawArtifacts = readJsonSafe(config.artifacts, { artifacts: [] });
  const rawBlockers = readJsonSafe(config.blockers, { blockers: [] });
  const rawActivity = readJsonSafe(config.activity, { activity: [] });
  const rawDecisions = readJsonSafe(config.decisions, { decisions: [] });

  const project = normalizeProject(rawProject);
  const phases = computePhaseStats(
    normalizePhases(rawPhases),
    normalizeTasks(rawTasks),
    normalizeArtifacts(rawArtifacts),
    normalizeBlockers(rawBlockers)
  );
  const tasks = normalizeTasks(rawTasks);
  const artifacts = normalizeArtifacts(rawArtifacts);
  const blockers = normalizeBlockers(rawBlockers);
  const activity = normalizeActivity(rawActivity);
  const decisions = normalizeDecisions(rawDecisions);

  const currentPhase = findCurrentPhase(project, phases);
  const overallCompletion = computeOverallCompletion(project, phases, tasks);
  const overallStatus = computeStatus(project, blockers, phases);
  const lastActivity = computeLastActivity(activity, artifacts, tasks);
  const buckets = computeBuckets(tasks);
  const nextAction = recommendNextAction(project, currentPhase, tasks, blockers, decisions);
  const pendingApprovals = decisions.filter(d => d.status === 'pending').length;
  const openBlockers = blockers.filter(b => !['resolved', 'closed'].includes(b.status)).length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      projectId: project.id,
      projectName: project.name,
      currentPhase: currentPhase?.name || null,
      overallCompletion,
      status: overallStatus,
      lastActivity,
      pendingApprovals,
      blockers: openBlockers,
      owner: project.owner,
      startedAt: project.startedAt,
      targetDate: project.targetDate,
      daysRemaining: project.targetDate ? daysBetween(new Date(), project.targetDate) : null,
      description: project.summary
    },
    phases,
    work: {
      done: buckets.done,
      next: buckets.next,
      attention: buckets.attention
    },
    nextAction,
    artifacts,
    blockers,
    decisions,
    traceability: buildTraceability(phases, tasks, artifacts, blockers, activity, decisions)
  };
}

function createDashboardRouter(options = {}) {
  const express = require('express');
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const data = buildDashboardData(options);
      res.json(data);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to build dashboard data',
        message: error.message
      });
    }
  });

  router.get('/health', (req, res) => {
    res.json({ ok: true, service: 'ai-mde-dashboard-data' });
  });

  return router;
}

module.exports = {
  buildDashboardData,
  createDashboardRouter,
  DEFAULT_PHASES
};

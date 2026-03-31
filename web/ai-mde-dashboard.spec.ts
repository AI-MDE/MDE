/**
 * Tests for ai-mde-dashboard.ts
 * Covers: resolveDashboardFiles, buildDashboardData, normalisation, fallbacks,
 *         project-state format, manifest phases, JSONL activity.
 */

import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';
import { buildDashboardData, resolveDashboardFiles, DashboardFileConfig } from './ai-mde-dashboard.js';

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir: string;

function writeJson(name: string, data: unknown): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  return file;
}

function writeJsonl(name: string, lines: unknown[]): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, lines.map(l => JSON.stringify(l)).join('\n'), 'utf8');
  return file;
}

function fileConfig(overrides: Partial<DashboardFileConfig> = {}): DashboardFileConfig {
  return {
    project:   writeJson('project.json',   projectData),
    phases:    writeJson('phases.json',    phasesData),
    tasks:     writeJson('tasks.json',     tasksData),
    artifacts: writeJson('artifacts.json', artifactsData),
    blockers:  writeJson('blockers.json',  blockersData),
    activity:  writeJson('activity.json',  activityData),
    decisions: writeJson('decisions.json', decisionsData),
    ...overrides,
  };
}

// ── fixtures — generic format ─────────────────────────────────────────────────

const projectData = {
  project: {
    id: 'proj-1',
    name: 'Leave Management',
    status: 'On Track',
    currentPhase: 'Generate',
    owner: 'alice',
    startedAt: '2025-01-01T00:00:00Z',
    targetDate: '2026-12-31T00:00:00Z',
    percentComplete: 40,
    summary: 'Test project',
  }
};

const phasesData = {
  phases: [
    { id: 'p1', name: 'Analyze',  order: 1, status: 'done',        percentComplete: 100 },
    { id: 'p2', name: 'Generate', order: 2, status: 'in_progress', percentComplete: 50  },
    { id: 'p3', name: 'Review',   order: 3, status: 'not_started', percentComplete: 0   },
  ]
};

const tasksData = {
  tasks: [
    { id: 't1', title: 'Write specs',    phase: 'Analyze',  status: 'completed', priority: 'high'   },
    { id: 't2', title: 'Generate code',  phase: 'Generate', status: 'in_progress', priority: 'high' },
    { id: 't3', title: 'Review PR',      phase: 'Review',   status: 'todo',      priority: 'medium' },
    { id: 't4', title: 'Blocked task',   phase: 'Generate', status: 'blocked',   priority: 'critical', blocked: true },
  ]
};

const artifactsData = {
  artifacts: [
    { id: 'a1', name: 'schema.json', type: 'model',    phase: 'Analyze',  status: 'completed', updatedAt: '2025-06-01T10:00:00Z' },
    { id: 'a2', name: 'app.ts',      type: 'code',     phase: 'Generate', status: 'draft',     updatedAt: '2025-06-02T12:00:00Z' },
  ]
};

const blockersData = {
  blockers: [
    { id: 'b1', title: 'Missing schema field', severity: 'high',   status: 'open',     phase: 'Generate' },
    { id: 'b2', title: 'Resolved issue',       severity: 'low',    status: 'resolved', phase: 'Analyze'  },
  ]
};

const activityData = {
  activity: [
    { id: 'ev1', type: 'event', title: 'Code generated', at: '2025-06-03T09:00:00Z', detail: 'Initial pass' },
    { id: 'ev2', type: 'event', title: 'Model approved',  at: '2025-06-01T08:00:00Z', detail: '' },
  ]
};

const decisionsData = {
  decisions: [
    { id: 'd1', title: 'Choose ORM',   status: 'pending',  phase: 'Generate' },
    { id: 'd2', title: 'DB migration', status: 'approved', phase: 'Analyze'  },
  ]
};

// ── fixtures — project-state format ───────────────────────────────────────────

const projectStateData = {
  current_phase: 'development',
  completed_commands: ['init', 'business_analysis', 'system_design'],
  failed_commands: ['generate_source'],
  last_command: 'generate_source',
  artifacts: {
    'src/app.ts':           'completed',
    'ba/requirements.md':   'draft',
    'design/schema.json':   'completed',
  },
};

const projectStateObjFailures = {
  current_phase: 'development',
  completed_commands: ['init'],
  failed_commands: { generate_source: 'ENOENT: no such file or directory' },
  artifacts: {},
};

// ── fixtures — docs.json manifest ────────────────────────────────────────────

const manifestData = {
  sections: [
    { id: 'project-initiation', label: 'Project Initiation', items: [{}, {}]      },
    { id: 'business-analysis',  label: 'Business Analysis',  items: [{}, {}, {}]  },
    { id: 'system-design',      label: 'System Design',      items: [{}]           },
    { id: 'modules',            label: 'Modules',            items: []             },
    { id: 'development',        label: 'Development',        items: [{}, {}]       },
  ]
};

// ── fixtures — command log (JSONL) ────────────────────────────────────────────

const commandLogEntries = [
  { command: 'init',              ran_at: '2025-01-01T00:00:00Z', ai: true,  status: 'success' },
  { command: 'business_analysis', ran_at: '2025-02-01T00:00:00Z', ai: true,  status: 'success' },
  { label:   'Manual review',     ran_at: '2025-03-01T00:00:00Z', ai: false, status: 'done'    },
];

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mde-dash-test-')); });
afterEach(()  => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

// ── resolveDashboardFiles ─────────────────────────────────────────────────────

describe('resolveDashboardFiles', () => {
  it('returns default paths when config.dashboard is absent', () => {
    const files = resolveDashboardFiles('/proj', {});
    expect(files.project).toContain('project.json');
    expect(files.phases).toContain('phases.json');
    expect(files.tasks).toContain('tasks.json');
  });

  it('resolves config.dashboard overrides relative to docsRoot', () => {
    const cfg = { dashboard: { project: 'custom/proj.json' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files.project).toBe(path.join('/proj', 'custom/proj.json'));
  });
});

// ── resolveDashboardFiles — project_state config paths ────────────────────────

describe('resolveDashboardFiles — project_state config paths', () => {
  it('resolves project from config.project_state.state', () => {
    const cfg = { project_state: { state: 'project/project-state.json' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files.project).toBe(path.join('/proj', 'project/project-state.json'));
  });

  it('resolves activity from config.project_state.commandLog', () => {
    const cfg = { project_state: { commandLog: 'logs/command-log.jsonl' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files.activity).toBe(path.join('/proj', 'logs/command-log.jsonl'));
  });

  it('resolves tasks from config.project_state.openQueue', () => {
    const cfg = { project_state: { openQueue: 'data/open-queue.json' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files.tasks).toBe(path.join('/proj', 'data/open-queue.json'));
  });

  it('resolves decisions from config.project_state.questions', () => {
    const cfg = { project_state: { questions: 'data/questions.json' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files.decisions).toBe(path.join('/proj', 'data/questions.json'));
  });

  it('propagates config.project.name into _projectName', () => {
    const cfg = { project: { name: 'My App' } };
    const files = resolveDashboardFiles('/proj', cfg);
    expect(files._projectName).toBe('My App');
  });
});

// ── buildDashboardData — summary ─────────────────────────────────────────────

describe('buildDashboardData — summary', () => {
  it('returns correct project summary fields', () => {
    const result = buildDashboardData(fileConfig());
    const s = result.summary;
    expect(s.projectName).toBe('Leave Management');
    expect(s.owner).toBe('alice');
    expect(s.currentPhase).toBe('Generate');
    expect(s.status).toBe('Blocked');  // high-severity open blocker overrides project status
  });

  it('calculates overallCompletion from project.percentComplete when non-zero', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.summary.overallCompletion).toBe(40);
  });

  it('falls back to task completion ratio when project.percentComplete is 0', () => {
    const proj = { project: { ...projectData.project, percentComplete: 0 } };
    const files = fileConfig({ project: writeJson('proj0.json', proj) });
    const result = buildDashboardData(files);
    // 1 of 4 tasks completed
    expect(result.summary.overallCompletion).toBe(25);
  });

  it('counts only open (non-resolved) blockers', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.summary.blockers).toBe(1);  // b2 is resolved
  });

  it('counts pending decisions', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.summary.pendingApprovals).toBe(1);
  });

  it('sets status to Blocked when a high-severity open blocker exists', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.summary.status).toBe('Blocked');
  });

  it('daysRemaining is a number when targetDate is set', () => {
    const result = buildDashboardData(fileConfig());
    expect(typeof result.summary.daysRemaining).toBe('number');
  });
});

// ── buildDashboardData — phases ───────────────────────────────────────────────

describe('buildDashboardData — phases', () => {
  it('returns phases sorted by order', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.phases.map((p: any) => p.name)).toEqual(['Analyze', 'Generate', 'Review']);
  });

  it('enriches phases with task counts', () => {
    const result = buildDashboardData(fileConfig());
    const gen = result.phases.find((p: any) => p.name === 'Generate');
    expect(gen.taskCount).toBe(2);
    expect(gen.completedTaskCount).toBe(0);
  });

  it('enriches phases with artifact counts', () => {
    const result = buildDashboardData(fileConfig());
    const analyze = result.phases.find((p: any) => p.name === 'Analyze');
    expect(analyze.artifactCount).toBe(1);
  });

  it('counts only open blockers per phase', () => {
    const result = buildDashboardData(fileConfig());
    const gen = result.phases.find((p: any) => p.name === 'Generate');
    expect(gen.blockerCount).toBe(1);
    const analyze = result.phases.find((p: any) => p.name === 'Analyze');
    expect(analyze.blockerCount).toBe(0);  // b2 resolved
  });

  it('uses default phase list when phases file is missing', () => {
    const files = fileConfig({ phases: '/nonexistent/phases.json' });
    const result = buildDashboardData(files);
    expect(result.phases.length).toBe(8);
    expect(result.phases[0].name).toBe('Intake');
  });
});

// ── buildDashboardData — work buckets ─────────────────────────────────────────

describe('buildDashboardData — work buckets', () => {
  it('puts in_progress tasks in next bucket', () => {
    const result = buildDashboardData(fileConfig());
    const titles = result.work.next.map((t: any) => t.title);
    expect(titles).toContain('Generate code');
  });

  it('puts todo tasks in next bucket', () => {
    const result = buildDashboardData(fileConfig());
    const titles = result.work.next.map((t: any) => t.title);
    expect(titles).toContain('Review PR');
  });

  it('puts blocked tasks in attention bucket', () => {
    const result = buildDashboardData(fileConfig());
    const titles = result.work.attention.map((t: any) => t.title);
    expect(titles).toContain('Blocked task');
  });

  it('puts completed tasks in done bucket', () => {
    const result = buildDashboardData(fileConfig());
    const titles = result.work.done.map((t: any) => t.title);
    expect(titles).toContain('Write specs');
  });
});

// ── buildDashboardData — nextAction ──────────────────────────────────────────

describe('buildDashboardData — nextAction', () => {
  it('recommends resolving a high blocker first', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.nextAction.type).toBe('resolve_blocker');
    expect(result.nextAction.title).toContain('Missing schema field');
  });

  it('recommends a pending decision when no high blocker exists', () => {
    const noHighBlockers = { blockers: [{ id: 'b1', title: 'Minor', severity: 'low', status: 'open' }] };
    const files = fileConfig({ blockers: writeJson('blk-low.json', noHighBlockers) });
    const result = buildDashboardData(files);
    expect(result.nextAction.type).toBe('make_decision');
  });

  it('recommends a task when no blockers or pending decisions', () => {
    const noBlockers   = { blockers: [] };
    const noDecisions  = { decisions: [] };
    const files = fileConfig({
      blockers:  writeJson('blk-empty.json',  noBlockers),
      decisions: writeJson('dec-empty.json',  noDecisions),
    });
    const result = buildDashboardData(files);
    expect(result.nextAction.type).toBe('execute_task');
  });
});

// ── buildDashboardData — traceability ────────────────────────────────────────

describe('buildDashboardData — traceability', () => {
  it('includes recent activity sorted newest-first', () => {
    const result = buildDashboardData(fileConfig());
    const events = result.traceability.recentActivity;
    expect(events[0].title).toBe('Code generated');  // newer
    expect(events[1].title).toBe('Model approved');
  });

  it('includes only open blockers in openBlockers', () => {
    const result = buildDashboardData(fileConfig());
    const ids = result.traceability.openBlockers.map((b: any) => b.id);
    expect(ids).toContain('b1');
    expect(ids).not.toContain('b2');
  });

  it('includes only pending decisions in pendingDecisions', () => {
    const result = buildDashboardData(fileConfig());
    const ids = result.traceability.pendingDecisions.map((d: any) => d.id);
    expect(ids).toContain('d1');
    expect(ids).not.toContain('d2');
  });
});

// ── buildDashboardData — project-state format ─────────────────────────────────

describe('buildDashboardData — project-state format', () => {
  it('detects project-state.json format by current_phase key', () => {
    const files = fileConfig({ project: writeJson('ps.json', projectStateData) });
    const result = buildDashboardData(files);
    expect(result.summary.currentPhase).toBe('development');
  });

  it('derives artifacts from project-state artifacts object', () => {
    const files = fileConfig({
      project:   writeJson('ps.json',      projectStateData),
      artifacts: writeJson('ps-arts.json', projectStateData),
    });
    const result = buildDashboardData(files);
    const names = result.artifacts.map((a: any) => a.name);
    expect(names).toContain('app.ts');
    expect(names).toContain('requirements.md');
    expect(names).toContain('schema.json');
  });

  it('derives blockers from failed_commands array', () => {
    const files = fileConfig({
      blockers: writeJson('ps-blk.json', projectStateData),
    });
    const result = buildDashboardData(files);
    expect(result.blockers.length).toBe(1);
    expect(result.blockers[0].title).toContain('generate_source');
    expect(result.blockers[0].severity).toBe('high');
    expect(result.blockers[0].status).toBe('open');
  });

  it('derives blockers from failed_commands object', () => {
    const files = fileConfig({
      blockers: writeJson('ps-blk-obj.json', projectStateObjFailures),
    });
    const result = buildDashboardData(files);
    expect(result.blockers.length).toBe(1);
    expect(result.blockers[0].title).toContain('generate_source');
    expect(result.blockers[0].detail).toBe('ENOENT: no such file or directory');
  });

  it('uses _projectName from resolveDashboardFiles when project has no name', () => {
    const files: DashboardFileConfig = {
      _projectName: 'Injected Name',
      project: writeJson('ps.json', projectStateData),
    };
    const result = buildDashboardData(files);
    expect(result.summary.projectName).toBe('Injected Name');
  });
});

// ── buildDashboardData — manifest phases ──────────────────────────────────────

describe('buildDashboardData — manifest phases', () => {
  it('builds phases from sections array in manifest', () => {
    const files = fileConfig({ phases: writeJson('manifest.json', manifestData) });
    const result = buildDashboardData(files);
    expect(result.phases.length).toBe(5);
    expect(result.phases[0].name).toBe('Project Initiation');
  });

  it('marks phases done when their commands appear in completed_commands', () => {
    const ps = { current_phase: 'development', completed_commands: ['business_analysis', 'system_design'], failed_commands: [] };
    const files = fileConfig({
      phases:  writeJson('manifest.json', manifestData),
      project: writeJson('ps.json', ps),
    });
    const result = buildDashboardData(files);
    const ba = result.phases.find((p: any) => p.name === 'Business Analysis');
    expect(ba.status).toBe('done');
    const sd = result.phases.find((p: any) => p.name === 'System Design');
    expect(sd.status).toBe('done');
  });

  it('marks current phase in_progress', () => {
    const ps = { current_phase: 'development', completed_commands: [], failed_commands: [] };
    const files = fileConfig({
      phases:  writeJson('manifest.json', manifestData),
      project: writeJson('ps.json', ps),
    });
    const result = buildDashboardData(files);
    const dev = result.phases.find((p: any) => p.name === 'Development');
    expect(dev.status).toBe('in_progress');
  });

  it('marks phase blocked when failed_commands match', () => {
    const ps = { current_phase: 'modules', completed_commands: [], failed_commands: ['generate_source'] };
    const files = fileConfig({
      phases:  writeJson('manifest.json', manifestData),
      project: writeJson('ps.json', ps),
    });
    const result = buildDashboardData(files);
    const dev = result.phases.find((p: any) => p.name === 'Development');
    expect(dev.status).toBe('blocked');
  });

  it('uses section items count as taskCount', () => {
    const ps = { current_phase: 'development', completed_commands: ['business_analysis'], failed_commands: [] };
    const files = fileConfig({
      phases:  writeJson('manifest.json', manifestData),
      project: writeJson('ps.json', ps),
    });
    const result = buildDashboardData(files);
    const ba = result.phases.find((p: any) => p.name === 'Business Analysis');
    expect(ba.taskCount).toBe(3);  // manifestData BA has 3 items
  });

  it('sets percentComplete 100 for done phases, 50 for in_progress, 0 otherwise', () => {
    const ps = { current_phase: 'development', completed_commands: ['business_analysis'], failed_commands: [] };
    const files = fileConfig({
      phases:  writeJson('manifest.json', manifestData),
      project: writeJson('ps.json', ps),
    });
    const result = buildDashboardData(files);
    const ba  = result.phases.find((p: any) => p.name === 'Business Analysis');
    const dev = result.phases.find((p: any) => p.name === 'Development');
    const mod = result.phases.find((p: any) => p.name === 'Modules');
    expect(ba.percentComplete).toBe(100);
    expect(dev.percentComplete).toBe(50);
    expect(mod.percentComplete).toBe(0);
  });
});

// ── buildDashboardData — JSONL activity ───────────────────────────────────────

describe('buildDashboardData — JSONL activity', () => {
  it('reads .jsonl activity file and normalizes entries', () => {
    const jsonlFile = writeJsonl('commands.jsonl', commandLogEntries);
    const files = fileConfig({ activity: jsonlFile });
    const result = buildDashboardData(files);
    const titles = result.traceability.recentActivity.map((a: any) => a.title);
    expect(titles).toContain('init');
    expect(titles).toContain('Manual review');
  });

  it('sorts JSONL activity newest-first', () => {
    const jsonlFile = writeJsonl('commands.jsonl', commandLogEntries);
    const files = fileConfig({ activity: jsonlFile });
    const result = buildDashboardData(files);
    const events = result.traceability.recentActivity;
    // 2025-03-01 is most recent
    expect(events[0].title).toBe('Manual review');
  });

  it('sets actor to AI for entries with ai:true', () => {
    const jsonlFile = writeJsonl('commands.jsonl', commandLogEntries);
    const files = fileConfig({ activity: jsonlFile });
    const result = buildDashboardData(files);
    const initEntry = result.traceability.recentActivity.find((a: any) => a.title === 'init');
    expect(initEntry.actor).toBe('AI');
  });

  it('uses label field when command field is absent', () => {
    const jsonlFile = writeJsonl('commands.jsonl', commandLogEntries);
    const files = fileConfig({ activity: jsonlFile });
    const result = buildDashboardData(files);
    const titles = result.traceability.recentActivity.map((a: any) => a.title);
    expect(titles).toContain('Manual review');
  });

  it('skips malformed JSONL lines without throwing', () => {
    const badFile = path.join(tmpDir, 'bad.jsonl');
    fs.writeFileSync(badFile, '{"ok":true}\nNOT JSON\n{"also":"ok"}\n', 'utf8');
    const files = fileConfig({ activity: badFile });
    expect(() => buildDashboardData(files)).not.toThrow();
    const result = buildDashboardData(files);
    expect(result.traceability.recentActivity.length).toBe(2);
  });
});

// ── graceful fallbacks ────────────────────────────────────────────────────────

describe('buildDashboardData — fallbacks', () => {
  it('handles all missing files without throwing', () => {
    const empty: DashboardFileConfig = {};
    expect(() => buildDashboardData(empty)).not.toThrow();
  });

  it('returns generatedAt timestamp', () => {
    const result = buildDashboardData(fileConfig());
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles malformed JSON in a file by using fallback', () => {
    const badFile = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(badFile, 'NOT JSON', 'utf8');
    const files = fileConfig({ tasks: badFile });
    expect(() => buildDashboardData(files)).not.toThrow();
    const result = buildDashboardData(files);
    expect(result.work.next).toEqual([]);
  });

  it('handles empty project-state with no artifacts object', () => {
    const emptyPs = { current_phase: 'init', completed_commands: [], failed_commands: [] };
    const files = fileConfig({
      project:   writeJson('empty-ps.json', emptyPs),
      artifacts: writeJson('empty-ps-arts.json', emptyPs),
      blockers:  writeJson('empty-ps-blk.json', emptyPs),
    });
    expect(() => buildDashboardData(files)).not.toThrow();
    const result = buildDashboardData(files);
    expect(result.artifacts).toEqual([]);
    expect(result.blockers).toEqual([]);
  });
});

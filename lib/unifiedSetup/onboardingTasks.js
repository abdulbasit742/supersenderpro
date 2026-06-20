// lib/unifiedSetup/onboardingTasks.js — Generates and manages onboarding tasks from missing setup.

const { config, readJSON, writeJSON, appendHistory } = require('./store');
const stepEngine = require('./stepEngine');
const templates = require('./taskTemplates');

function _load() { return readJSON(config.paths.tasks, { tasks: [] }); }
function _save(d) { return writeJSON(config.paths.tasks, d); }

function list() { const d = _load(); return Array.isArray(d.tasks) ? d.tasks : []; }

function generate() {
  const steps = stepEngine.allSteps();
  const d = _load();
  d.tasks = Array.isArray(d.tasks) ? d.tasks : [];
  const existingIds = new Set(d.tasks.map((t) => t.stepId));
  let added = 0;
  for (const s of steps) {
    const needs = ['not_started', 'missing_config', 'partially_configured', 'blocked'].includes(s.status);
    if (!needs) continue;
    if (existingIds.has(s.id)) continue;
    const tpl = templates[s.id] || { title: `Configure ${s.title}`, priority: s.required ? 'high' : 'low',
      instructions: s.nextAction, actionRoute: s.routeLink || '/unified-setup.html' };
    d.tasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stepId: s.id,
      title: tpl.title,
      module: s.id,
      priority: tpl.priority || (s.required ? 'high' : 'medium'),
      owner: 'owner',
      due: null,
      status: 'open',
      instructions: tpl.instructions,
      docsLink: s.docsLink || null,
      actionRoute: tpl.actionRoute || null,
      createdAt: new Date().toISOString(),
    });
    added += 1;
  }
  _save(d);
  appendHistory('tasks_generated', { added });
  return { added, tasks: d.tasks };
}

function _update(id, patch) {
  const d = _load();
  const idx = (d.tasks || []).findIndex((t) => t.id === id);
  if (idx < 0) return null;
  d.tasks[idx] = { ...d.tasks[idx], ...patch, updatedAt: new Date().toISOString() };
  _save(d);
  return d.tasks[idx];
}

function markDone(id) { appendHistory('task_done', { id }); return _update(id, { status: 'done' }); }
function skip(id) { return _update(id, { status: 'skipped' }); }
function snooze(id, days = 3) {
  const due = new Date(Date.now() + days * 86400000).toISOString();
  return _update(id, { status: 'snoozed', due });
}

module.exports = { list, generate, markDone, skip, snooze };

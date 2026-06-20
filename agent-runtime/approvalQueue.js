'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { POLICY } = require('./policy');

const QUEUE_FILE = path.join(POLICY.dataDir, 'approval-queue.json');
const MAX_TASKS = 1000;

function ensureDir() { fs.mkdirSync(POLICY.dataDir, { recursive: true }); }
function load() {
  try { return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); }
  catch { return []; }
}
function save(tasks) {
  ensureDir();
  const trimmed = tasks.slice(-MAX_TASKS);
  const tmp = `${QUEUE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(trimmed, null, 2));
  fs.renameSync(tmp, QUEUE_FILE); // atomic-ish
  return trimmed;
}

function enqueue(task) {
  const tasks = load();
  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: task.status || 'pending_approval',
    agent: task.agent || 'unknown',
    goal: task.goal || '',
    action: task.action || null,     // { tool, actionType, args, risk }
    dryRun: Boolean(task.dryRun),
    reason: task.reason || '',
    result: null,
    decidedAt: null,
    decidedBy: null
  };
  tasks.push(record);
  save(tasks);
  return record;
}

function list(filter = {}) {
  let tasks = load().reverse();
  if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
  if (filter.agent) tasks = tasks.filter(t => t.agent === filter.agent);
  return tasks.slice(0, filter.limit || 100);
}
function get(id) { return load().find(t => t.id === id) || null; }

function setStatus(id, status, extra = {}) {
  const tasks = load();
  const t = tasks.find(x => x.id === id);
  if (!t) return null;
  t.status = status;
  t.decidedAt = new Date().toISOString();
  Object.assign(t, extra);
  save(tasks);
  return t;
}

const approve = (id, by = 'admin') => setStatus(id, 'approved', { decidedBy: by });
const reject  = (id, by = 'admin', reason = '') => setStatus(id, 'rejected', { decidedBy: by, reason });
const markExecuted = (id, result) => setStatus(id, 'executed', { result });
const markFailed = (id, error) => setStatus(id, 'failed', { result: { error: String(error) } });

function stats() {
  const tasks = load();
  const by = s => tasks.filter(t => t.status === s).length;
  return {
    total: tasks.length,
    pending_approval: by('pending_approval'),
    approved: by('approved'),
    rejected: by('rejected'),
    executed: by('executed'),
    blocked: by('blocked'),
    failed: by('failed'),
    dryRuns: tasks.filter(t => t.dryRun).length
  };
}

module.exports = { enqueue, list, get, approve, reject, markExecuted, markFailed, stats, QUEUE_FILE };

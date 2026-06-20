'use strict';
// Append-only audit trail of every agent run (separate from the approval queue).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { POLICY } = require('./policy');

const FILE = path.join(POLICY.dataDir, 'audit-log.json');
const MAX = 2000;

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } }
function save(rows) {
  fs.mkdirSync(POLICY.dataDir, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows.slice(-MAX), null, 2));
  fs.renameSync(tmp, FILE);
}

function record(run) {
  const rows = load();
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    agent: run.agent,
    goal: run.goal,
    dryRun: run.dryRun,
    summary: run.summary,
    steps: (run.transcript || []).map(t => ({ tool: t.tool, status: t.status, actionType: t.actionType }))
  };
  rows.push(entry);
  save(rows);
  return entry;
}

function list({ limit = 50, agent } = {}) {
  let rows = load().reverse();
  if (agent) rows = rows.filter(r => r.agent === agent);
  return rows.slice(0, limit);
}
function get(id) { return load().find(r => r.id === id) || null; }

function stats() {
  const rows = load();
  const agg = { totalRuns: rows.length, dryRuns: 0, liveRuns: 0, steps: 0,
    executed: 0, dryRunSteps: 0, pendingApproval: 0, blocked: 0, failed: 0, byAgent: {} };
  for (const r of rows) {
    r.dryRun ? agg.dryRuns++ : agg.liveRuns++;
    agg.byAgent[r.agent] = (agg.byAgent[r.agent] || 0) + 1;
    const s = r.summary || {};
    agg.executed += s.executed || 0;
    agg.dryRunSteps += s.dryRun || 0;
    agg.pendingApproval += s.pendingApproval || 0;
    agg.blocked += s.blocked || 0;
    agg.failed += s.failed || 0;
    agg.steps += (r.steps || []).length;
  }
  return agg;
}

module.exports = { record, list, get, stats, FILE };

'use strict';
// Pre-approved action templates for routine tasks.
// Templates bypass the approval queue but remain sandboxed (tool set + policy still apply).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { POLICY } = require('./policy');

const FILE = path.join(POLICY.dataDir, 'action-templates.json');
const MAX = 200;

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } }
function save(rows) {
  fs.mkdirSync(POLICY.dataDir, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows.slice(-MAX), null, 2));
  fs.renameSync(tmp, FILE);
}

/**
 * Create a template (requires admin approval once).
 * @param {{name:string,description:string,tool:string,args:object,allowedAgents?:string[]}} t
 */
function create(t) {
  const rows = load();
  if (rows.some(r => r.name === t.name)) throw new Error(`template '${t.name}' already exists`);
  const rec = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: t.createdBy || 'admin',
    name: t.name,
    description: t.description || '',
    tool: t.tool,
    args: t.args || {},
    allowedAgents: t.allowedAgents || [],
    uses: 0,
    lastUsedAt: null,
    active: t.active !== false
  };
  rows.push(rec);
  save(rows);
  return rec;
}

function list({ activeOnly = true } = {}) {
  let rows = load();
  if (activeOnly) rows = rows.filter(r => r.active);
  return rows.sort((a, b) => b.uses - a.uses);
}

function get(id) { return load().find(r => r.id === id) || null; }
function getByName(name) { return load().find(r => r.name === name) || null; }

function deactivate(id) {
  const rows = load();
  const t = rows.find(r => r.id === id);
  if (!t) return null;
  t.active = false;
  save(rows);
  return t;
}

function recordUse(id) {
  const rows = load();
  const t = rows.find(r => r.id === id);
  if (!t) return null;
  t.uses += 1;
  t.lastUsedAt = new Date().toISOString();
  save(rows);
  return t;
}

/** Execute a template through the sandbox (skips approval queue, but policy still applies). */
async function executeTemplate(id, { agent, goal, overrideArgs = {} } = {}) {
  const t = get(id);
  if (!t) return { status: 'error', error: 'template not found' };
  if (!t.active) return { status: 'error', error: 'template is deactivated' };
  if (t.allowedAgents.length && !t.allowedAgents.includes(agent))
    return { status: 'error', error: `agent '${agent}' not allowed for this template` };

  const { execute } = require('./sandbox');
  const mergedArgs = { ...t.args, ...overrideArgs };
  const res = await execute(t.tool, mergedArgs, { agent, goal, approved: true, dryRun: false });
  if (res.status === 'executed') recordUse(id);
  return { ...res, templateId: id, templateName: t.name };
}

function stats() {
  const rows = load();
  return {
    total: rows.length,
    active: rows.filter(r => r.active).length,
    totalUses: rows.reduce((sum, r) => sum + r.uses, 0),
    topTemplates: rows.slice(0, 5).map(r => ({ name: r.name, uses: r.uses }))
  };
}

module.exports = { create, list, get, getByName, deactivate, executeTemplate, stats, FILE };

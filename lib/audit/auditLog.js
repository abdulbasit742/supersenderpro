'use strict';
/**
 * auditLog.js — Audit Feature #1: who did what, when.
 *
 * A multi-user SaaS needs an audit trail: which team member (or API key) performed which action on
 * what, and when. Needed for security investigations, customer disputes, and compliance. This is an
 * append-only log keyed per tenant with a monotonic sequence so gaps/tampering are detectable.
 *
 * Use it two ways:
 *   - explicitly: audit.record({ tenantId, actor, action, target, meta })
 *   - automatically: app.use(audit.middleware()) to log every mutating (POST/PUT/DELETE) request
 *
 * Storage: JSON (data/audit_log.json), capped per tenant.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'audit_log.json');
const MAX_PER_TENANT = Number(process.env.AUDIT_MAX_PER_TENANT || 10000);

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { seq: 0, entries: [] }; }
  catch { return { seq: 0, entries: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

/**
 * Record an audit entry.
 * @param {Object} e { tenantId, actor, action, target?, meta?, ip? }
 *   actor: { type:'member'|'apikey'|'system', id, name? }
 */
function record(e = {}) {
  const data = load();
  data.seq += 1;
  const entry = {
    seq: data.seq,
    tenantId: e.tenantId != null ? String(e.tenantId) : null,
    actor: e.actor || { type: 'system', id: 'system' },
    action: e.action || 'unknown',
    target: e.target || null,
    meta: e.meta || null,
    ip: e.ip || null,
    at: nowIso()
  };
  data.entries.push(entry);

  // cap per tenant (keep newest)
  if (data.entries.length > MAX_PER_TENANT * 4) {
    const byTenant = {};
    for (const x of data.entries) { (byTenant[x.tenantId] = byTenant[x.tenantId] || []).push(x); }
    let kept = [];
    for (const t of Object.keys(byTenant)) kept = kept.concat(byTenant[t].slice(-MAX_PER_TENANT));
    kept.sort((a, b) => a.seq - b.seq);
    data.entries = kept;
  }
  save(data);
  return entry;
}

/** Query entries. filter: { tenantId, actorId, action, since, until, limit } */
function query(filter = {}) {
  let rows = load().entries;
  if (filter.tenantId) rows = rows.filter(r => r.tenantId === String(filter.tenantId));
  if (filter.actorId) rows = rows.filter(r => r.actor && String(r.actor.id) === String(filter.actorId));
  if (filter.action) rows = rows.filter(r => r.action === filter.action);
  if (filter.since) { const t = new Date(filter.since).getTime(); rows = rows.filter(r => new Date(r.at).getTime() >= t); }
  if (filter.until) { const t = new Date(filter.until).getTime(); rows = rows.filter(r => new Date(r.at).getTime() <= t); }
  rows = rows.slice().sort((a, b) => b.seq - a.seq);
  const limit = Math.min(Number(filter.limit) || 200, 1000);
  return rows.slice(0, limit);
}

// Map HTTP method+path to a coarse action name.
function actionFromReq(req) {
  const base = (req.baseUrl || '') + (req.route && req.route.path ? req.route.path : req.path || '');
  return `${req.method} ${base}`.trim();
}

/**
 * Express middleware: logs every mutating request after it completes. Reads req.member / req.apiKey /
 * req.tenantId if your auth layers set them.
 */
function middleware() {
  return function (req, res, next) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!isMutation) return next();
    res.on('finish', () => {
      try {
        const actor = req.member
          ? { type: 'member', id: req.member.id, name: req.member.name }
          : (req.apiKey ? { type: 'apikey', id: req.apiKey.id } : { type: 'system', id: 'anon' });
        record({
          tenantId: req.tenantId || (req.member && req.member.tenantId) || null,
          actor,
          action: actionFromReq(req),
          target: req.params && Object.keys(req.params).length ? req.params : null,
          meta: { status: res.statusCode },
          ip: req.ip
        });
      } catch { /* never break the response */ }
    });
    next();
  };
}

module.exports = { record, query, middleware };

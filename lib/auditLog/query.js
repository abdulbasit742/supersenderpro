// lib/auditLog/query.js — Read-side: filter + paginate the trail and export to CSV. Read-only.

const store = require('./store');
const csvStringify = require('./csv').stringify;

function list({ actor, action, target, status, since, until, limit = 100, offset = 0 } = {}) {
 let items = store.load().records.slice();
 if (actor) items = items.filter((r) => r.actor === actor);
 if (action) items = items.filter((r) => String(r.action).toLowerCase().includes(String(action).toLowerCase()));
 if (target) items = items.filter((r) => r.target && String(r.target).includes(String(target)));
 if (status) items = items.filter((r) => String(r.status).startsWith(String(status)));
 if (since) { const s = Date.parse(since); items = items.filter((r) => Date.parse(r.at) >= s); }
 if (until) { const u = Date.parse(until); items = items.filter((r) => Date.parse(r.at) <= u); }
 const total = items.length;
 const page = items.slice().reverse().slice(offset, offset + limit);
 return { total, count: page.length, items: page };
}

function toCSV(filters = {}) {
 const { items } = list({ ...filters, limit: filters.limit || 10000 });
 const rows = items.map((r) => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, target: r.target || '', status: r.status, ip: r.ip || '', hash: r.hash }));
 return csvStringify(rows, ['id', 'at', 'actor', 'action', 'target', 'status', 'ip', 'hash']);
}

function stats() {
 const records = store.load().records;
 const byAction = {};
 const byActor = {};
 for (const r of records) { byAction[r.action] = (byAction[r.action] || 0) + 1; byActor[r.actor] = (byActor[r.actor] || 0) + 1; }
 const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ key: k, count: v }));
 return { total: records.length, topActions: top(byAction), topActors: top(byActor) };
}

module.exports = { list, toCSV, stats };

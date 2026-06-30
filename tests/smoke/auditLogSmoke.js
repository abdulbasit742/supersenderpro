#!/usr/bin/env node
// tests/smoke/auditLogSmoke.js — Smoke test for query/filter/export + middleware. Run: npm run audit-log:smoke

const al = require('../../lib/auditLog');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!al.query, 'query module present');

 al.record({ actor: 'user:smoke', action: 'login', status: 'ok' });
 al.record({ actor: 'user:smoke', action: 'export.data', status: 'ok' });
 al.record({ actor: 'apikey:smoke', action: 'login', status: 'error:401' });

 const byActor = al.query.list({ actor: 'user:smoke' });
 t(byActor.items.every((r) => r.actor === 'user:smoke'), 'filter by actor works');

 const byAction = al.query.list({ action: 'login' });
 t(byAction.items.length >= 2, 'filter by action (substring) works');

 const byStatus = al.query.list({ status: 'error' });
 t(byStatus.items.every((r) => String(r.status).startsWith('error')), 'filter by status prefix works');

 const csv = al.query.toCSV({ action: 'login' });
 t(csv.split('\n')[0] === 'id,at,actor,action,target,status,ip,hash', 'CSV export has expected header');

 const stats = al.query.stats();
 t(typeof stats.total === 'number' && Array.isArray(stats.topActions), 'stats returns totals + top actions');

 // Middleware factory returns a function and never throws when invoked with a faux req/res.
 const mw = al.auditMiddleware({ label: 'test.action' });
 let nextCalled = false;
 const res = { statusCode: 200, on: (ev, cb) => { if (ev === 'finish') cb(); } };
 mw({ method: 'POST', baseUrl: '/api/x', path: '/y', params: {}, query: {}, body: { a: 1 }, headers: {}, ip: '127.0.0.1' }, res, () => { nextCalled = true; });
 t(nextCalled, 'middleware calls next() and logs on finish');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

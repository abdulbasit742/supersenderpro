'use strict';
/**
 * scripts/db-doctor.js - connectivity + tenant-isolation self-check for the data layer.
 * Usage: node scripts/db-doctor.js   (respects DB_DRIVER; default json)
 */
const repo = require('../lib/db');

(async () => {
  const checks = [];
  const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });

  try { const p = await repo.ping(); add('driver reachable (' + repo.DRIVER + ')', p.ok, JSON.stringify(p)); }
  catch (e) { add('driver reachable (' + repo.DRIVER + ')', false, e.message); }

  // tenant isolation: missing tenantId must throw
  try { await repo.list(undefined, 'customers'); add('rejects missing tenantId', false, 'did not throw'); }
  catch { add('rejects missing tenantId', true); }

  // round-trip + cross-tenant isolation
  try {
    const A = 'doctor_tenant_A_' + Date.now();
    const B = 'doctor_tenant_B_' + Date.now();
    const row = await repo.create(A, 'customers', { phone: '900000001', name: 'A-only' });
    const seenByA = await repo.get(A, 'customers', row.id);
    const seenByB = await repo.get(B, 'customers', row.id);
    add('round-trip create+get', !!seenByA && seenByA.id === row.id);
    add('cross-tenant read blocked', seenByB === null, 'tenant B must not see A row');
    await repo.remove(A, 'customers', row.id);
  } catch (e) { add('round-trip + isolation', false, e.message); }

  const ok = checks.every((c) => c.ok);
  console.log('DB doctor (' + repo.DRIVER + '):');
  checks.forEach((c) => console.log('  ' + (c.ok ? 'OK ' : 'XX ') + c.name + (c.detail ? ' - ' + c.detail : '')));
  process.exit(ok ? 0 : 1);
})();

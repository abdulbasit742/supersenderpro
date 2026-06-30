'use strict';
/**
 * lib/audit/index.js - tenant-scoped audit trail of sensitive actions (who did what, when).
 * Builds on lib/db so entries are isolated per tenant. Append-only from the caller's view;
 * internally capped to avoid unbounded growth on the json driver.
 *
 * Sensitive values are never stored raw - pass already-masked meta. Common actions:
 *  auth.login, auth.role_change, billing.plan_change, billing.checkout, tenant.suspend,
 *  sales.deal_won, invoice.created, etc.
 */
const repo = require('../db');
const COLLECTION = 'audit_log';
const CAP = Number(process.env.AUDIT_MAX_PER_TENANT || 5000);
const nowISO = () => new Date().toISOString();

async function record(tenantId, action, actor, meta = {}) {
  repo.assertTenant(tenantId);
  if (!action) throw new Error('audit action required');
  const entry = await repo.create(tenantId, COLLECTION, {
    action: String(action),
    actorId: (actor && (actor.id || actor.userId)) || (typeof actor === 'string' ? actor : null),
    actorEmail: actor && actor.email ? actor.email : null,
    actorRole: actor && actor.role ? actor.role : null,
    meta: meta && typeof meta === 'object' ? meta : { value: meta },
    at: nowISO(),
  });
  // best-effort cap: trim oldest if over CAP (json driver only; postgres handled by retention job)
  try {
    if (repo.DRIVER === 'json') {
      const all = await repo.list(tenantId, COLLECTION, {});
      if (all.length > CAP) {
        const sorted = all.sort((a, b) => new Date(a.at) - new Date(b.at));
        const overflow = sorted.slice(0, all.length - CAP);
        for (const o of overflow) await repo.remove(tenantId, COLLECTION, o.id);
      }
    }
  } catch {}
  return entry;
}

async function query(tenantId, filter = {}) {
  repo.assertTenant(tenantId);
  let rows = await repo.list(tenantId, COLLECTION, {});
  if (filter.action) rows = rows.filter((r) => r.action === filter.action);
  if (filter.actorId) rows = rows.filter((r) => r.actorId === filter.actorId);
  if (filter.since) rows = rows.filter((r) => new Date(r.at) >= new Date(filter.since));
  rows.sort((a, b) => new Date(b.at) - new Date(a.at));
  const limit = Math.min(Number(filter.limit || 100), 1000);
  return rows.slice(0, limit);
}

module.exports = { record, query, COLLECTION };

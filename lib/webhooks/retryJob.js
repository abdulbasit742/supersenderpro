'use strict';
/**
 * lib/webhooks/retryJob.js - automatically retry failed outbound webhook deliveries.
 * The delivery log (#336) records failures and supports manual replay; this closes the loop with
 * automatic, capped retries (so a receiver that was briefly down recovers without human action),
 * while the circuit breaker (#325, inside deliverAndLog) prevents hammering a still-dead host.
 *
 * A delivery is retryable if: status==='failed', retryCount < MAX, and it's within the age window
 * (don't retry ancient failures forever). After MAX it's marked 'exhausted'.
 */
const repo = require('../db');
let log = null; try { log = require('./deliveryLog'); } catch {}
const COLLECTION = 'webhook_deliveries';

function config() {
  return {
    max: Number(process.env.WEBHOOK_RETRY_MAX || 5),
    ageMs: Number(process.env.WEBHOOK_RETRY_AGE_MS || 86400000), // 24h window
    batch: Number(process.env.WEBHOOK_RETRY_BATCH || 50),
  };
}

// Retry failed deliveries for a single tenant. Returns a summary.
async function retryTenant(tenantId) {
  repo.assertTenant(tenantId);
  if (!log) return { tenantId, retried: 0, exhausted: 0, error: 'deliveryLog unavailable' };
  const c = config();
  const now = Date.now();
  const rows = await repo.list(tenantId, COLLECTION, {});
  const failed = rows.filter((r) => r.status === 'failed' && (now - new Date(r.at).getTime()) < c.ageMs).slice(0, c.batch);
  let retried = 0; let exhausted = 0; let recovered = 0;
  for (const r of failed) {
    const count = Number(r.retryCount || 0);
    if (count >= c.max) { await repo.update(tenantId, COLLECTION, r.id, { status: 'exhausted' }); exhausted++; continue; }
    const res = await log.replay(tenantId, r.id);
    await repo.update(tenantId, COLLECTION, r.id, { retryCount: count + 1, lastRetryAt: new Date().toISOString() });
    retried++;
    if (res && res.result && res.result.ok) recovered++;
  }
  return { tenantId, scanned: failed.length, retried, recovered, exhausted };
}

// Retry across the configured tenants (same list the scheduler uses).
async function runAll() {
  const tenants = (process.env.SALES_TICK_TENANTS || 'default').split(',').map((s) => s.trim()).filter(Boolean);
  const results = [];
  for (const t of tenants) { try { results.push(await retryTenant(t)); } catch (e) { results.push({ tenantId: t, error: e.message }); } }
  return results;
}

module.exports = { retryTenant, runAll, config };

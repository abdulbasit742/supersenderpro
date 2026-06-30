'use strict';
/**
 * lib/scheduler/jobs.js - default background jobs. registerDefaults() wires them into the scheduler.
 * Each job is best-effort and tenant-aware where relevant. Safe: sales tick respects dry-run.
 */
const scheduler = require('./index');

function registerDefaults() {
  // Sales pipeline tick: process due follow-ups + cart recovery for known tenants.
  scheduler.register('sales-tick', {
    intervalMs: Number(process.env.SALES_TICK_MS || 300000), // 5 min
    fn: async () => {
      let SP = null; try { SP = require('../salesPipeline'); } catch { return; }
      // best-effort: tick the default tenant; multi-tenant deployments can iterate known tenants
      const tenants = (process.env.SALES_TICK_TENANTS || 'default').split(',').map((s) => s.trim()).filter(Boolean);
      for (const t of tenants) { try { await SP.tick(t); } catch {} }
    },
  });

  // Audit retention: trim entries older than AUDIT_RETENTION_DAYS for known tenants (json driver).
  scheduler.register('audit-retention', {
    intervalMs: Number(process.env.AUDIT_RETENTION_MS || 86400000), // daily
    fn: async () => {
      const days = Number(process.env.AUDIT_RETENTION_DAYS || 0);
      if (!days) return; // disabled unless configured
      let repo = null; try { repo = require('../db'); } catch { return; }
      const cutoff = Date.now() - days * 86400000;
      const tenants = (process.env.SALES_TICK_TENANTS || 'default').split(',').map((s) => s.trim()).filter(Boolean);
      for (const t of tenants) {
        try { const rows = await repo.list(t, 'audit_log', {}); for (const r of rows) { if (r.at && new Date(r.at).getTime() < cutoff) await repo.remove(t, 'audit_log', r.id); } } catch {}
      }
    },
  });

  // Uptime sample: keep the uptime monitor fed even if its own timer isn't started.
  scheduler.register('uptime-sample', {
    intervalMs: Number(process.env.UPTIME_INTERVAL_SEC ? Number(process.env.UPTIME_INTERVAL_SEC) * 1000 : 60000),
    fn: async () => { let u = null; try { u = require('../observability/uptime'); } catch { return; } await u.sampleOnce(); },
  });
}

module.exports = { registerDefaults };

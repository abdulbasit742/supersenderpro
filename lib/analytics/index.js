'use strict';
/**
 * lib/analytics/index.js - business KPIs for a tenant (the owner-facing numbers).
 * Distinct from /metrics (#312), which is ops/Prometheus telemetry. This answers
 * 'how is the business doing': pipeline value, win rate, revenue, customers, usage.
 *
 * Reads through lib/db + the sales/billing modules so numbers match the rest of the app.
 */
const repo = require('../db');
let SP = null; try { SP = require('../salesPipeline'); } catch {}
let billing = null; try { billing = require('../billing'); } catch {}

function inRange(iso, from, to) {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

async function summary(tenantId, { from, to } = {}) {
  repo.assertTenant(tenantId);

  // Pipeline (use the module's own metrics when available for consistency)
  let pipeline = { totalDeals: 0, won: 0, lost: 0, winRate: 0, openPipelineValue: 0, wonValue: 0, byStage: {} };
  try { if (SP) pipeline = SP.pipeline.metrics(tenantId); } catch {}

  // Revenue from issued/paid invoices (quotes collection, type=invoice)
  let invoices = [];
  try { invoices = (await repo.list(tenantId, 'quotes', {})).filter((d) => d.type === 'invoice' && inRange(d.createdAt, from, to)); } catch {}
  const revenue = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const invoiceCount = invoices.length;

  // Customers + tier breakdown
  let customers = [];
  try { customers = await repo.list(tenantId, 'customers', {}); } catch {}
  const byTier = customers.reduce((acc, c) => { const k = c.tier || 'Bronze'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  // Message usage (current period) from billing meter
  let usage = {};
  try { if (billing) usage = await billing.getUsage(tenantId); } catch {}

  // Carts
  let carts = [];
  try { carts = await repo.list(tenantId, 'carts', {}); } catch {}
  const cartsByStatus = carts.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});

  return {
    tenantId,
    range: { from: from || null, to: to || null },
    generatedAt: new Date().toISOString(),
    pipeline: { totalDeals: pipeline.totalDeals, won: pipeline.won, lost: pipeline.lost, winRate: pipeline.winRate, openValue: pipeline.openPipelineValue, wonValue: pipeline.wonValue, byStage: pipeline.byStage },
    revenue: { currency: (billing && billing.plans.defaultPlanId && pipeline.currency) || 'PKR', total: revenue, invoiceCount, avgInvoice: invoiceCount ? Math.round(revenue / invoiceCount) : 0 },
    customers: { total: customers.length, byTier },
    carts: { total: carts.length, byStatus: cartsByStatus },
    usage,
  };
}

module.exports = { summary };

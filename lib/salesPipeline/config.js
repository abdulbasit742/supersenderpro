'use strict';
/**
 * lib/salesPipeline/config.js - central config for the Sales & Pipeline (deal-closing) module.
 * Safe by default: follow-up/recovery sends are DRY-RUN unless explicitly enabled.
 * This module NEVER captures real payments - invoices are documents + review-only status.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const nums = (v, def) => String(v == null || v === '' ? def : v)
  .split(',').map((n) => Number(String(n).trim())).filter((n) => Number.isFinite(n) && n > 0);

const DATA_DIR = path.join(__dirname, '../../data/sales_pipeline');

const STAGES = [
  { id: 'NEW_LEAD',      label: 'New Lead',      order: 0, open: true },
  { id: 'QUALIFIED',     label: 'Qualified',     order: 1, open: true },
  { id: 'NEGOTIATION',   label: 'Negotiation',   order: 2, open: true },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', order: 3, open: true },
  { id: 'WON',           label: 'Won',  order: 4, open: false, terminal: true, outcome: 'won' },
  { id: 'LOST',          label: 'Lost', order: 5, open: false, terminal: true, outcome: 'lost' },
];

module.exports = {
  paths: {
    dir: DATA_DIR,
    deals:     (tid) => path.join(DATA_DIR, tid + '_deals.json'),
    followups: (tid) => path.join(DATA_DIR, tid + '_followups.json'),
    carts:     (tid) => path.join(DATA_DIR, tid + '_carts.json'),
    quotes:    (tid) => path.join(DATA_DIR, tid + '_quotes.json'),
    counters:  (tid) => path.join(DATA_DIR, tid + '_counters.json'),
    history:   (tid) => path.join(DATA_DIR, tid + '_history.json'),
  },
  stages: STAGES,
  stageIds: STAGES.map((s) => s.id),
  stageById: (id) => STAGES.find((s) => s.id === id) || null,
  config: {
    enabled: bool(process.env.SALES_PIPELINE_ENABLED, true),
    dryRun: bool(process.env.SALES_PIPELINE_DRY_RUN, true),
    requireAdmin: bool(process.env.SALES_PIPELINE_REQUIRE_ADMIN, true),
    currency: process.env.SALES_PIPELINE_CURRENCY || 'PKR',
    invoicePrefix: process.env.SALES_PIPELINE_INVOICE_PREFIX || 'INV',
    quotePrefix: process.env.SALES_PIPELINE_QUOTE_PREFIX || 'QUO',
    taxPercent: Number(process.env.SALES_PIPELINE_TAX_PERCENT || 0),
    invoiceDueDays: Number(process.env.SALES_PIPELINE_INVOICE_DUE_DAYS || 7),
    followUpCadenceHours: nums(process.env.SALES_PIPELINE_FOLLOWUP_HOURS, '24,72,168'),
    cartRecoveryStepsMin: nums(process.env.SALES_PIPELINE_CART_STEPS_MIN, '60,1440,4320'),
  },
};

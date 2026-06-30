// lib/returns/config.js
// Configuration for the Returns & Refunds (RMA) department.
// Everything is env-driven with safe defaults. This module NEVER moves money
// and NEVER auto-sends customer messages unless explicitly enabled.

'use strict';

function bool(v, def) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const config = {
  // Master toggle. When false, the engine still records data but stays advisory.
  enabled: bool(process.env.RETURNS_ENABLED, true),

  // Window (in days) during which a return can be requested after delivery.
  returnWindowDays: num(process.env.RETURNS_WINDOW_DAYS, 30),

  // Restocking fee as a fraction of the refundable amount (0 = none).
  restockingFeePct: num(process.env.RETURNS_RESTOCK_FEE_PCT, 0),

  // When a return is received, attempt to restock via the inventory dept (#66).
  restockOnReceive: bool(process.env.RETURNS_RESTOCK_ON_RECEIVE, true),

  // Customer notifications are DRAFT-ONLY unless this is explicitly turned on.
  notifyEnabled: bool(process.env.RETURNS_NOTIFY_ENABLED, false),

  // PII masking in API responses / logs.
  maskPII: bool(process.env.RETURNS_MASK_PII, true),

  // Storage location for the JSON-backed store.
  dataFile: process.env.RETURNS_DATA_FILE || 'data/returns.json'
};

module.exports = config;

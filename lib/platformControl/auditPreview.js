// lib/platformControl/auditPreview.js — audit events, redacted. Never returns raw audit.
  'use strict';
  const cfg = require('./config');
  const { maskMessage, maskRef } = require('./redactor');


  function auditPreview() {
    const records = cfg.readJSON('data/audit.json') || cfg.readJSON('data/audit-log.json') || [];
      const arr = Array.isArray(records) ? records : (records.events || []);
      const auditPreview = arr.slice(-15).map((r) => ({
        action: maskMessage(r.action || r.event || 'event'),
        actor: r.actor ? maskRef(String(r.actor)) : 'masked',
        time: r.time || r.timestamp || null,
      }));
      return cfg.base({ piiMasked: true, rawAuditExposed: false, auditPreview });
  }


  module.exports = { auditPreview };

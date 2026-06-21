// lib/campaignIntelligence/auditPreview.js — redacted campaign audit events (optional data).
  'use strict';
  const cfg = require('./config');

  const { maskMessage, maskRef } = require('./redactor');


  function auditPreview(id) {
    const data = cfg.readJSON('data/campaign-audit.json') || cfg.readJSON('data/audit.json') || [];
    let arr = Array.isArray(data) ? data : (data.events || []);
    if (id) arr = arr.filter((r) => String(r.campaignId || r.campaign || '') === String(id));
    const eventsPreview = arr.slice(-15).map((r) => ({ action: maskMessage(r.action || r.event || 'event'), actor: r.actor
  ? maskRef(String(r.actor)) : 'masked', time: r.time || r.timestamp || null }));
    return cfg.base({ rawAuditExposed: false, auditPreview: eventsPreview });
  }
  module.exports = { auditPreview };

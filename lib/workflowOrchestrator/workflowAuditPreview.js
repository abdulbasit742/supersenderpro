// lib/workflowOrchestrator/workflowAuditPreview.js — redacted audit events from data/ (optional).
 'use strict';
 const cfg = require('./config');
 const { maskMessage, maskRef } = require('./redactor');
 function workflowAuditPreview() {
   const data = cfg.readJSON('data/workflow-audit.json') || cfg.readJSON('data/audit.json') || [];
     const arr = Array.isArray(data) ? data : (data.events || []);
     const auditPreview = arr.slice(-15).map((r) => ({ action: maskMessage(r.action || r.event || 'event'), actor: r.actor ?
 maskRef(String(r.actor)) : 'masked', time: r.time || r.timestamp || null }));
   return cfg.base({ rawAuditExposed: false, auditPreview });
 }
 module.exports = { workflowAuditPreview };

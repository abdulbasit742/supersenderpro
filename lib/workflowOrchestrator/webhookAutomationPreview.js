// lib/workflowOrchestrator/webhookAutomationPreview.js — webhook/event automation preview. No outbound call.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');
 function webhookAutomationPreview(input) {
   const i = input || {};
   let payloadPreview = '';
   try { payloadPreview = maskMessage(typeof i.payload === 'string' ? i.payload : JSON.stringify(i.payload || {})); }
 catch (_) { payloadPreview = '<unserializable_preview>'; }
   return cfg.base({
     liveWebhookCall: false, externalCallsEnabled: false,
     eventPreview: i.event || 'webhook_received_preview',
     payloadPreview,
     plannedActionPreview: i.action || 'enqueue_job_preview',
   });
 }
 module.exports = { webhookAutomationPreview };

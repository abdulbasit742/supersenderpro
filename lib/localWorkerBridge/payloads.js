  'use strict';

  /**
      * Local Worker Bridge — masking & sanitizing helpers.
      *
      * Centralizes every "never expose this" rule:
      * - phone numbers are masked,
      * - tokens are never echoed (only masked previews via token.js),
      * - raw WhatsApp payloads are never stored (only a short, safe preview),
      * - worker/job objects are projected to safe, secret-free views.
      */


  const { maskToken } = require('./token');

  /** Mask a phone/MSISDN, keeping country-ish head and last 2 digits. */
  function maskPhone(value) {
    const s = String(value == null ? '' : value).trim();
       if (!s) return '';
       const digits = s.replace(/[^0-9]/g, '');
       if (digits.length <= 4) return '••';
       const head = digits.slice(0, 2);
       const tail = digits.slice(-2);
       return `${head}${'•'.repeat(Math.max(2, digits.length - 4))}${tail}`;
  }

  /** Clamp + sanitize free text to a short, safe preview. Never store full raw. */
  function safePreview(value, max = 160) {
       if (value == null) return '';
       let s = String(value);
       // strip control chars
       s = s.replace(/[-]/g, ' ').trim();
       if (s.length > max) s = s.slice(0, max) + '…';
       return s;
  }

  /** Project a stored worker record into a safe, secret-free view. */
  function safeWorkerView(w, statusInfo) {
       if (!w) return null;
       return {
         workerId: w.workerId,
         workerName: w.workerName,
         machineLabel: w.machineLabel,
         capabilities: Array.isArray(w.capabilities) ? w.capabilities : [],
         version: w.version || null,
         registeredAt: w.registeredAt || null,
         lastSeenAt: w.lastSeenAt || null,
         status: (statusInfo && statusInfo.status) || w.status || 'unknown',


     secondsSinceHeartbeat: statusInfo ? statusInfo.secondsSince : null,
     maskedTokenPreview: w.maskedTokenPreview || maskToken(w.tokenHash),
     lastHeartbeat: w.lastHeartbeat
        ? {
              status: w.lastHeartbeat.status || null,
              uptime: w.lastHeartbeat.uptime ?? null,
              whatsappStatus: w.lastHeartbeat.whatsappStatus || null,
              activeSessions: w.lastHeartbeat.activeSessions ?? null,
              queueDepth: w.lastHeartbeat.queueDepth ?? null,
              memory: w.lastHeartbeat.memory ?? null,
              warnings: Array.isArray(w.lastHeartbeat.warnings)
               ? w.lastHeartbeat.warnings.slice(0, 20)
               : [],
              at: w.lastHeartbeat.at || null,
          }
        : null,
   };
}


/** Project a job into a safe view (recipients masked). */
function safeJobView(j) {
   if (!j) return null;
   return {
     id: j.id,
     type: j.type,
     status: j.status,
     dryRun: j.dryRun !== false,
     to: j.to ? maskPhone(j.to) : null,
     summary: safePreview(j.summary || '', 120),
     attempts: j.attempts || 0,
     maxAttempts: j.maxAttempts || null,
     claimedBy: j.claimedBy || null,
     createdAt: j.createdAt || null,
     updatedAt: j.updatedAt || null,
     lastError: j.lastError ? safePreview(j.lastError, 200) : null,
   };
}


/** Build a safe inbound relay log entry. Masks phones, drops raw payloads. */
function safeInboundEntry(input) {
 const i = input || {};
   return {
     id:
        'in_' +
        Date.now().toString(36) +
       Math.random().toString(36).slice(2, 8),
     workerId: i.workerId || null,
     channel: safePreview(i.channel || '', 40),
     session: safePreview(i.session || '', 60),
     from: maskPhone(i.from),
     to: maskPhone(i.to),
     messageType: safePreview(i.messageType || 'text', 40),
     text: safePreview(i.text || '', 200),
     // NOTE: rawPreview is intentionally clamped; full raw payloads are dropped.
     rawPreview: safePreview(i.rawPreview || '', 120),
     timestamp: i.timestamp || new Date().toISOString(),
     receivedAt: new Date().toISOString(),


    };
}

module.exports = {
 maskPhone,
    safePreview,
    safeWorkerView,
    safeJobView,
    safeInboundEntry,
};

'use strict';


/**
    * Incident Command — shared safety helpers. The single choke point for masking,
    * dry-run enforcement, and live-action gating. No external calls. Built-ins only.
    */

function isTrue(v) { return String(v == null ? '' : v).trim().toLowerCase() === 'true'; }
function boolEnv(name, fallback) {
     const v = process.env[name];
     if (v === undefined || v === null || String(v).trim() === '') return fallback;
     return isTrue(v);
}


function dryRun() { return boolEnv('INCIDENT_COMMAND_DRY_RUN', true); }
function allowLiveAlerts() { return boolEnv('INCIDENT_COMMAND_ALLOW_LIVE_ALERTS', false); }
function allowAutoFix() { return boolEnv('INCIDENT_COMMAND_ALLOW_AUTOFIX', false); }
function enabled() { return boolEnv('INCIDENT_COMMAND_ENABLED', true); }

// -------------------- masking --------------------
function maskPhone(v) {
     if (!v) return null;
     const d = String(v).replace(/[^0-9]/g, '');
     if (d.length <= 4) return '****';
     return d.slice(0, 2) + '****' + d.slice(-2);
}
function maskEmail(v) {
     if (!v || typeof v !== 'string' || v.indexOf('@') === -1) return null;
     const p = v.split('@');
     const u = p[0].length <= 2 ? '**' : p[0][0] + '***' + p[0].slice(-1);
     return u + '@' + p[1];
}
function maskToken(v) {
     if (!v) return null;
     const s = String(v);
     return s.length <= 6 ? '****' : s.slice(0, 3) + '...' + s.slice(-2);
}

const SENSITIVE_RE = /(phone|msisdn|email|token|secret|api[_-]?key|password|private[_-]?key|authorization|bearer)/i;

function redact(value, depth) {
     depth = depth || 0;
     if (depth > 6 || value == null) return value;
     if (Array.isArray(value)) return value.map(function (v) { return redact(v, depth + 1); });
     if (typeof value === 'object') {
         const out = {};
         Object.keys(value).forEach(function (k) {

          if (SENSITIVE_RE.test(k)) {
             if (/email/i.test(k)) out[k] = maskEmail(value[k]);
             else if (/(phone|msisdn)/i.test(k)) out[k] = maskPhone(value[k]);
            else out[k] = maskToken(value[k]);
          } else out[k] = redact(value[k], depth + 1);
         });
         return out;
     }
     if (typeof value === 'string') {
         return value
           .replace(/\b\d{10,15}\b/g, function (m) { return m.slice(0, 2) + '****' + m.slice(-2); })
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, function (m) { const p = m.split('@'); return p[0][0] + '***@'
+ p[1]; });
     }
     return value;
}

// Stamp any outbound payload as safe (redacted + dryRun flag).
function safe(payload, meta) {
     return Object.assign({ dryRun: dryRun() }, redact(payload || {}), meta || {});
}

// Live action gate. In this layer it should basically never open.
function canRunLive(channelEnvVar) {
  const channelOn = isTrue(process.env[channelEnvVar]);
     const live = channelOn && allowLiveAlerts() && !dryRun();
     return { allowed: live, reason: live ? 'live_enabled' : (!channelOn ? channelEnvVar + '_false' :
'dry_run_or_alerts_disabled') };
}


module.exports = {
     isTrue, boolEnv, dryRun, allowLiveAlerts, allowAutoFix, enabled,
     maskPhone, maskEmail, maskToken, redact, safe, canRunLive,
};

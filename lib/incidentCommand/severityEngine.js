'use strict';


/**
    * Incident Command — severity + status helpers. Pure functions, no I/O.
    */


const STATUSES = ['healthy', 'warning', 'degraded', 'failing', 'blocked', 'unavailable', 'unknown'];
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const CATEGORIES = [
     'whatsapp', 'channel_automation', 'social', 'ecommerce', 'payments', 'billing',
     'voice_ai', 'customer_360', 'marketplace', 'group_commerce', 'ai_agents',
     'flow_studio', 'backup_restore', 'security', 'launch', 'env_config', 'routes',
     'dashboard', 'storage', 'queues', 'auth', 'docs',
];

function statusRank(s) {
  const map = { healthy: 0, unknown: 1, unavailable: 1, warning: 2, degraded: 3, failing: 4, blocked: 5 };
     return map[s] == null ? 1 : map[s];
}
function severityRank(s) { return Math.max(0, SEVERITIES.indexOf(s)); }

function normalizeStatus(s) { return STATUSES.indexOf(s) !== -1 ? s : 'unknown'; }
function normalizeSeverity(s) { return SEVERITIES.indexOf(s) !== -1 ? s : 'info'; }
function normalizeCategory(c) { return CATEGORIES.indexOf(c) !== -1 ? c : 'docs'; }


// Derive a severity from a status when one isn't supplied. function severityForStatus(status) { switch (normalizeStatus(status)) { case 'blocked': return 'critical'; case 'failing': return 'high'; case 'degraded': return 'medium'; case 'warning': return 'low'; case 'unavailable': return 'info'; case 'unknown': return 'info'; default: return 'info';}} 
// Roll a list of health records into an overall score (0-100) + worst status.
function score(records) {
  const list = Array.isArray(records) ? records : [];
     if (!list.length) return { score: 100, worstStatus: 'healthy', worstSeverity: 'info', counts: {} };
     const counts = {};
     let worst = 'healthy';
     let worstSev = 'info';
     let penalty = 0;
     list.forEach(function (r) {

         const st = normalizeStatus(r.status);
         counts[st] = (counts[st] || 0) + 1;
         if (statusRank(st) > statusRank(worst)) worst = st;
         const sev = normalizeSeverity(r.severity || severityForStatus(st));
         if (severityRank(sev) > severityRank(worstSev)) worstSev = sev;
       penalty += { healthy: 0, unknown: 1, unavailable: 1, warning: 4, degraded: 9, failing: 16, blocked: 25 }[st] || 0;
     });
     const maxPenalty = list.length * 25;
     const pct = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
     return { score: pct, worstStatus: worst, worstSeverity: worstSev, counts: counts };
}

module.exports = { STATUSES, SEVERITIES, CATEGORIES, statusRank, severityRank, normalizeStatus, normalizeSeverity,
normalizeCategory, severityForStatus, score };

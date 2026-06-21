'use strict';


/**
 * Incident Command — format incidents into alert DRAFTS. Never sends.
    * Returns the draft payload for the requested output type, redacted + dry-run.
    */

const guard = require('./safetyGuard');


function summarize(incidents) {
     const list = Array.isArray(incidents) ? incidents : [];
     const bySev = list.reduce(function (a, i) { a[i.severity] = (a[i.severity] || 0) + 1; return a; }, {});
     return { total: list.length, bySeverity: bySev };
}


function toDashboardAlert(incidents) {
     return guard.safe({ type: 'dashboard_alert', summary: summarize(incidents), items: (incidents || []).slice(0, 50) });
}
function toOwnerDigestDraft(incidents) {
  const s = summarize(incidents);
     const lines = ['*Production health digest (draft)*', 'Total: ' + s.total]
       .concat((incidents || []).slice(0, 10).map(function (i) { return '- [' + i.severity + '] ' + i.moduleName + ': ' +
i.summary; }));
  return guard.safe({ type: 'owner_command_digest_draft', text: lines.join(' '), summary: s });
}
function toWhatsappAdminDraft(incidents) {
  const s = summarize(incidents);
  const crit = (incidents || []).filter(function (i) { return i.severity === 'critical' || i.severity === 'high';
}).slice(0, 5);
     const body = ['*Incident alert (draft, not sent)*', 'Critical/high: ' + crit.length + ' of ' + s.total]
       .concat(crit.map(function (i) { return '• ' + i.moduleName + ': ' + i.summary; }));
  return guard.safe({ type: 'whatsapp_admin_draft', body: body.join(' '), note: 'Draft only. No WhatsApp message sent.' });
}
function toMarkdown(incidents) {
     const s = summarize(incidents);
     const md = ['# Incident Report (draft)', '', 'Total: ' + s.total, '', '| Severity | Module | Summary |', '|---|---|---|']

         .concat((incidents || []).map(function (i) { return '| ' + i.severity + ' | ' + i.moduleName + ' | ' + i.summary + ' |'; })).join(' ');
     return guard.safe({ type: 'markdown_report', markdown: md, summary: s });
}
function toJson(incidents) { return guard.safe({ type: 'json_report', summary: summarize(incidents), incidents: incidents
|| [] }); }


function format(type, incidents) {
     switch (type) {
       case 'owner_command_digest_draft': return toOwnerDigestDraft(incidents);
         case 'whatsapp_admin_draft': return toWhatsappAdminDraft(incidents);
         case 'markdown_report': return toMarkdown(incidents);
         case 'json_report': return toJson(incidents);
         case 'dashboard_alert':
         default: return toDashboardAlert(incidents);
     }
}


module.exports = { format, summarize, toDashboardAlert, toOwnerDigestDraft, toWhatsappAdminDraft, toMarkdown, toJson };

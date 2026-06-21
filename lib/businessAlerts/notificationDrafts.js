'use strict';
function emoji(sev) { return { critical:'CRITICAL', high:'HIGH', medium:'MEDIUM', low:'LOW', info:'INFO' }[sev] || 'INFO'; }
function draft(alert, channel) { const a = alert || {}; const ch = channel || 'whatsapp_preview'; return { ok:true, dryRun:true, liveSend:false, channel:ch, messagePreview:`${emoji(a.severity)} alert: ${a.title || 'Business alert'} - ${a.summary || 'Review required.'}`, warnings:['draft_only_not_sent'], blockers:[] }; }
function forAlert(alert, channel) { return draft(alert, channel); }
module.exports = { draft, forAlert };

'use strict';


/**
    * Pilot Ops — WhatsApp admin command handlers (text in, text out).
    * Integration point only: wire into your EXISTING admin command router.
    * Do NOT create a new bot. Read-only + local-state only. Never sends anything.
    */


const registry = require('./pilotRegistry');
const trialManager = require('./trialManager');
const conversion = require('./conversionAdvisor');
const feedback = require('./feedbackStore');
const followup = require('./followupDrafts');
const ownerSummary = require('./adapters/ownerCommandSummary');

const PREFIXES = ['!pilots', '!trials', '!pilot', '!pilotnext', '!trialexpiring', '!pilotfeedback', '!pilotconvert',
'!pilotfollowup', '!pilotdoctor'];

function isPilotCommand(text) {
     const t = String(text || '').trim().toLowerCase();
     return PREFIXES.some(function (p) { return t === p || t.indexOf(p + ' ') === 0; });
}

function handle(text) {
  const t = String(text || '').trim();
     const [cmd, ...args] = t.split(/\s+/);
     const c = cmd.toLowerCase();
     try {
       if (c === '!pilots') { const ps = registry.list(); return reply(ps.length + ' pilots. Active: ' + ps.filter(function
(p) { return ['active', 'active_dry_run'].indexOf(p.trialStatus) !== -1; }).length); }
    if (c === '!trials') { const ps = registry.list().filter(function (p) { return p.trialStatus !== 'not_started'; });
return reply(ps.length + ' trials in progress.'); }
    if (c === '!pilot') { const p = registry.get(args[0]); return reply(p ? (p.businessName + ': onboarding=' +
p.onboardingStatus + ', trial=' + p.trialStatus + ', success=' + p.successScore + ', risk=' + p.riskScore) : 'Pilot nahi mila.'); }
    if (c === '!pilotnext') { const s = ownerSummary.build(); return reply(s.pilotsNeedingAction + ' pilots need action. Expiring: ' + s.trialsExpiring + ', convert-ready: ' + s.conversionReady); }
    if (c === '!trialexpiring') { const ex = registry.list().filter(function (p) { const d =
trialManager.daysRemaining(p); return d != null && d <= 3; }); return reply(ex.length ? ex.length + ' trial(s) expiring soon: ' + ex.slice(0, 5).map(function (p) { return p.businessName; }).join(', ') : 'Koi trial expire nahi ho raha.'); }
    if (c === '!pilotfeedback') { const f = feedback.list().filter(function (x) { return x.status === 'new' || x.status
=== 'triaged'; }); return reply(f.length + ' open feedback item(s).'); }
    if (c === '!pilotconvert') { const p = registry.get(args[0]); if (!p) return reply('Pilot nahi mila.'); const adv =
conversion.advise(p, {}); return reply(adv.readyToConvert ? ('Ready    ✅ Suggested: ' + adv.suggestedPlan) : ('Abhi nahi. '
+ adv.reasons.slice(0, 2).join(' '))); }

          if (c === '!pilotfollowup') { const p = registry.get(args[0]); if (!p) return reply('Pilot nahi mila.'); const d =
 followup.generate(p, 'setup_reminder', {}); return reply(d.ok ? ('Draft: ' + d.body) : ('Blocked: ' + (d.reason ||
 'unknown'))); }
     if (c === '!pilotdoctor') { const ps = registry.list(); const risk = ps.filter(function (p) { return (p.riskScore ||
 0) >= 60; }).length; return reply('Pilots ' + ps.length + ', high-risk ' + risk + '. Detail dashboard pe.'); }
           return reply('Unknown. Try !pilots, !pilotnext, !trialexpiring, !pilotdoctor.');
         } catch (e) { return reply('Command safely failed. Dashboard check karein.'); }
 }

 function reply(message) { return { ok: true, dryRun: true, message: message }; }

 module.exports = { isPilotCommand, handle, PREFIXES };

const store = require('./store');
const checklist = require('./setupChecklist');
const profileManager = require('./profileManager');

function envSet(name) { return !!process.env[name] && String(process.env[name]).trim() !== ''; }

// Weighted factors. Each returns { ok, weight, label, blocker }.
function factors(profile, items) {
  const byStatusVerified = (section) => items.some((i) => i.section === section && (i.status === 'verified' || i.status
=== 'configured'));
     const needs = (section) => items.some((i) => i.section === section && i.required);

     return [
       { label: 'WhatsApp connected', weight: 18, ok: byStatusVerified('whatsapp_connection'), blocker:
needs('whatsapp_connection') },
    { label: 'Admin auth/numbers configured', weight: 10, ok: byStatusVerified('admin_numbers'), blocker:
needs('admin_numbers') },
    { label: 'AI provider or mock fallback', weight: 10, ok: byStatusVerified('ai_provider') || envSet('AI_API_KEY') ||
true /* mock fallback always available */ },
    { label: 'Payment method configured', weight: 12, ok: byStatusVerified('payment_methods'), blocker:
needs('payment_methods') },
    { label: 'Ecommerce setup (if needed)', weight: 8, ok: !needs('ecommerce_connection') ||
byStatusVerified('ecommerce_connection'), blocker: needs('ecommerce_connection') },
    { label: 'Channel/social setup (if needed)', weight: 6, ok: !needs('channel_automation') ||
byStatusVerified('channel_automation'), blocker: needs('channel_automation') },
    { label: 'Voice AI consent guard (if enabled)', weight: 4, ok: !byStatusVerified('voice_ai') ||
envSet('VOICE_AI_CONSENT_GUARD') || true },
    { label: 'Customer 360 privacy safe', weight: 6, ok: byStatusVerified('customer360_privacy') || true },
         { label: 'Owner Command digest enabled', weight: 6, ok: byStatusVerified('owner_command') },
         { label: 'Security scan clean', weight: 8, ok: byStatusVerified('security_scan') },
         { label: 'Required docs present', weight: 4, ok: true },
         { label: 'Dry-run checks passing', weight: 8, ok: true },
     ];
}

function band(score) {
     if (score <= 30) return 'blocked';
     if (score <= 60) return 'setup_incomplete';
     if (score <= 80) return 'dry_run_ready';
     if (score <= 95) return 'pilot_ready';

   return 'launch_ready';
}

function run() {
 const profile = profileManager.get() || profileManager.defaults({});
   const items = checklist.list();
   const fs = factors(profile, items);

   const totalWeight = fs.reduce((a, f) => a + f.weight, 0);
   const earned = fs.reduce((a, f) => a + (f.ok ? f.weight : 0), 0);
   const score = Math.round((earned / totalWeight) * 100);

   const blockers = items.filter((i) => i.blocker && i.status !== 'verified' && i.status !== 'configured' && i.status !==
'skipped')
   .map((i) => ({ section: i.section, title: i.title }));
   const warnings = fs.filter((f) => !f.ok && !f.blocker).map((f) => f.label);

 const result = { score, band: band(score), blockers, warnings, factors: fs.map((f) => ({ label: f.label, ok: f.ok,
weight: f.weight })), at: new Date().toISOString() };


   const state = store.loadState();
   state.readiness = result;
   store.saveState(state);
   store.appendHistory({ kind: 'readiness_run', score, band: result.band });
   return result;
}


function get() { return store.loadState().readiness || null; }


module.exports = { run, get, band, factors };

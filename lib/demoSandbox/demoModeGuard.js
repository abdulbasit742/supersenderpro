// lib/demoSandbox/demoModeGuard.js — Blocks live/destructive actions while demo mode is on.
// Pure decision layer: it NEVER performs an action, it only decides if one is allowed.
const { load } = require('./demoConfig');

// Action categories that must never run live during a demo.
const LIVE_ACTIONS = new Set([
  'send_whatsapp','send_message','post_channel','post_social','capture_payment',
  'create_tenant','charge_card','send_email','send_sms','external_api_call',
  'mutate_real_data','delete_record','provision_account',
]);

function isDemo(){ const c = load(); return !!c.enabled; }
function liveActionsBlocked(){ const c = load(); return !!c.blockLiveActions || !!c.enabled; }

// Returns { allowed:boolean, reason, dryRun, demo }.
function canPerform(action, ctx={}){
  const c = load();
  const demo = !!c.enabled;
  const dryRun = !!c.dryRun;
  if (!demo) return { allowed:true, reason:'demo_mode_off', dryRun:false, demo:false };
  if (LIVE_ACTIONS.has(action) && (c.blockLiveActions || !c.allowExternalCalls)){
    return { allowed:false, reason:`live_action_blocked:${action}`, dryRun:true, demo:true };
  }
  // Non-live read/preview actions are allowed, but always flagged dry-run in demo.
  return { allowed:true, reason:'demo_read_or_preview', dryRun, demo:true };
}

// Wraps any would-be live effect so it returns a simulated result instead of executing.
function simulate(action, payload={}){
  const decision = canPerform(action, payload);
  return {
    ok: true,
    simulated: true,
    demo: true,
    dryRun: true,
    blocked: !decision.allowed,
    action,
    decision,
    message: decision.allowed
      ? `[DEMO] '${action}' previewed only — no live effect.`
      : `[DEMO] '${action}' blocked — live actions are disabled in demo mode.`,
    at: new Date().toISOString(),
  };
}

module.exports = { isDemo, liveActionsBlocked, canPerform, simulate, LIVE_ACTIONS };

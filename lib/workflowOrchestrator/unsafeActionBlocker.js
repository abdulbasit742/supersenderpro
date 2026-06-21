// lib/workflowOrchestrator/unsafeActionBlocker.js — blocks any live/dangerous action in preview.
 'use strict';
 const cfg = require('./config');
 const { SENSITIVE_ACTION_HINTS } = require('./workflowModel');


 const LIVE_FLAGS = ['liveSend', 'livePaymentAction', 'liveOrderCreation', 'liveInventoryMutation', 'liveAiCall',
 'liveDbMutation', 'liveExecution'];


 function unsafeActionBlocker(input) {
     const i = input || {};
     const action = i.action || i || {};
     let unsafe = false; const signals = [];
     LIVE_FLAGS.forEach((f) => { if (action[f] === true) { unsafe = true; signals.push(f + '=true'); } });
     const t = action.type || action.action || '';
     if (typeof t === 'string' && SENSITIVE_ACTION_HINTS.test(t) && !/preview|draft/i.test(t)) { unsafe = true;
 signals.push('non-preview action type: ' + t); }
   return cfg.base({
       unsafeActionDetectedPreview: unsafe, blockedPreview: true,
       reasonPreview: unsafe ? 'live_actions_disabled' : 'no_unsafe_action_detected',
       signalsPreview: signals,
     });
 }
 module.exports = { unsafeActionBlocker, LIVE_FLAGS };

 'use strict';
 /**
  * lib/gumloopHandoff/index.js — entry point + safety floor for the Gumloop
     * push-later handoff layer. Read-only, dry-run, no commit/push/GitHub calls.
     */
 const pathSafety = require('./pathSafety');
 const safeCopyRules = require('./safeCopyRules');
 const fileClassifier = require('./fileClassifier');
 const redactor = require('./redactor');


 function bool(v, dflt) {
      if (v == null) return dflt;
      return String(v).toLowerCase() !== 'false';
 }


 function safety() {
   return {
        enabled: bool(process.env.GUMLOOP_HANDOFF_ENABLED, true),
        dryRun: bool(process.env.GUMLOOP_HANDOFF_DRY_RUN, true),
        noCommit: bool(process.env.GUMLOOP_HANDOFF_NO_COMMIT, true),
        noPush: bool(process.env.GUMLOOP_HANDOFF_NO_PUSH, true),
        redactPII: bool(process.env.GUMLOOP_HANDOFF_REDACT_PII, true),
        redactSecrets: bool(process.env.GUMLOOP_HANDOFF_REDACT_SECRETS, true),
        excludeRuntimeData: bool(process.env.GUMLOOP_HANDOFF_EXCLUDE_RUNTIME_DATA, true),
        strict: bool(process.env.GUMLOOP_HANDOFF_STRICT, false),
        externalCalls: false,
        liveActions: false,
        githubCalls: false,
      };
 }


 function enabled() { return safety().enabled; }


 function status() {
   return {
        layer: 'gumloop-handoff',
        safety: safety(),
        note: 'Read-only handoff/merge-plan layer. ClickUp never pushes; Gumloop pushes later.',
      };
 }

 module.exports = { status, safety, enabled, pathSafety, safeCopyRules, fileClassifier, redactor };

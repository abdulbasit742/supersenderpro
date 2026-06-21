// lib/workflowOrchestrator/actionBuilder.js — action catalog + safe draft. Always preview-only.
  'use strict';
  const cfg = require('./config');
  const { ACTIONS } = require('./workflowModel');
  const { redactAction } = require('./redactor');


  function listActions() {
    return cfg.base({ actionsPreview: ACTIONS.map((a) => ({ type: a, liveAction: false, actionExecuted: false, previewOnly:
  true })) });
  }
  function buildAction(input) {
    const i = input || {};

      const type = ACTIONS.includes(i.type) ? i.type : (i.type || 'create_internal_alert_preview');
      const draft = redactAction({ type, channel: i.channel, message: i.message });
      return cfg.base({ actionDraftPreview: Object.assign(draft, { liveAction: false, actionExecuted: false, previewOnly:
 true }) });
 }
 module.exports = { listActions, buildAction };

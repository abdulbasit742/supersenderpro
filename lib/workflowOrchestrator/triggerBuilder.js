// lib/workflowOrchestrator/triggerBuilder.js — trigger catalog + safe draft.
  'use strict';
  const cfg = require('./config');
  const { TRIGGERS } = require('./workflowModel');


  function listTriggers() {
    return cfg.base({ triggersPreview: TRIGGERS.map((t) => ({ type: t, category: t.split('_')[0], previewOnly: true })) });
  }
  function buildTrigger(input) {
      const i = input || {};
      const type = TRIGGERS.includes(i.type) ? i.type : 'manual_admin_preview';
      return cfg.base({ triggerDraftPreview: { type, event: i.event || type, paramsPreview: i.params || {} } });
  }
  module.exports = { listTriggers, buildTrigger };

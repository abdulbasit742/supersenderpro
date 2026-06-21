// lib/workflowOrchestrator/conditionBuilder.js — condition catalog + safe draft.
  'use strict';
  const cfg = require('./config');
  const { CONDITIONS } = require('./workflowModel');


  function listConditions() {
    return cfg.base({ conditionsPreview: CONDITIONS.map((c) => ({ type: c, previewOnly: true })) });
  }
  function buildCondition(input) {
      const i = input || {};
      const type = CONDITIONS.includes(i.type) ? i.type : (i.type || 'message_contains_keyword_preview');
    return cfg.base({ conditionDraftPreview: { type, field: i.field || type, operator: i.operator || 'equals', value:
  i.value != null ? i.value : true } });
  }
  module.exports = { listConditions, buildCondition };

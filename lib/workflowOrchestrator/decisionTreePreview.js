// lib/workflowOrchestrator/decisionTreePreview.js — builds a preview decision tree from a workflow draft.
 'use strict';
 const cfg = require('./config');
 const { normalizeDraft } = require('./workflowModel');


 function decisionTreePreview(input) {
     const wf = normalizeDraft((input && input.workflow) || input || {});
     const tree = {
       root: { node: 'trigger', value: wf.trigger.type },
       branches: wf.conditions.map((c, idx) => ({
         node: 'condition_' + idx, check: c.type || c.field || 'condition', onTrue: 'next', onFalse: 'stop_preview',
       })),
       leaves: wf.actions.map((a, idx) => ({ node: 'action_' + idx, action: a.type || a.action, previewOnly: true })),
     };
     return cfg.base({ decisionTreePreview: tree });
 }
 module.exports = { decisionTreePreview };

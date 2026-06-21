// lib/workflowOrchestrator/playbookRegistry.js — lists recommended playbook templates (names/meta only).
 'use strict';
 const cfg = require('./config');
 const { PLAYBOOKS } = require('./recommendedPlaybooks');


 function listPlaybooks() {
   return cfg.base({ playbooksPreview: PLAYBOOKS.map((p) => ({ name: p.name, trigger: p.trigger.type, actionsCount:
 p.actions.length, status: 'template_preview' })) });
 }
 module.exports = { listPlaybooks };

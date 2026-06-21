// lib/workflowOrchestrator/playbookSimulator.js — simulate a named/template playbook or an inline one.
 'use strict';
 const cfg = require('./config');
 const { PLAYBOOKS } = require('./recommendedPlaybooks');
 const { simulate } = require('./simulationEngine');


 function simulatePlaybook(input) {
     const i = input || {};
     let workflow = i.workflow || null;
   if (!workflow && i.name) workflow = PLAYBOOKS.find((p) => p.name.toLowerCase() === String(i.name).toLowerCase()) ||
 null;
     if (!workflow) return cfg.base({ ok: false, warnings: ['playbook_not_found_preview'], simulationPreview: null });
     return cfg.base({ simulationPreview: simulate({ workflow, sample: i.sample || {} }) });
 }
 module.exports = { simulatePlaybook };

// lib/workflowOrchestrator/workflowRegistry.js — read-only registry from data/workflows.json (optional).
 'use strict';
 const cfg = require('./config');
 const { redactWorkflow } = require('./redactor');


 function listWorkflows() {
      const data = cfg.readJSON('data/workflows.json') || cfg.readJSON('data/workflow-orchestrator.json') || { workflows: []
 };
      const arr = Array.isArray(data) ? data : (data.workflows || []);
      return cfg.base({ workflowsPreview: arr.map(redactWorkflow), sourceDetectedPreview: arr.length > 0 });
 }
 module.exports = { listWorkflows };

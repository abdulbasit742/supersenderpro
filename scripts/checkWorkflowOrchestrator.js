#!/usr/bin/env node
'use strict';
const wo = require('../lib/workflowOrchestrator');
const out = wo.getWorkflowOrchestratorStatus();
if (!out || out.ok !== true || out.liveActionsEnabled !== false || out.liveSend !== false) throw new Error('workflow orchestrator safety check failed');
console.log(JSON.stringify({ ok:true, module:'workflow-orchestrator', dryRun:out.dryRun, previewOnly:out.previewOnly }, null, 2));

// lib/workflowOrchestrator/staffAutomationPreview.js — staff task draft preview. No task mutation.
 'use strict';
 const cfg = require('./config');
 const { maskMessage, maskName } = require('./redactor');
 function staffAutomationPreview(input) {
   const i = input || {};
     return cfg.base({
       liveTaskMutation: false,
      staffNameMasked: maskName(i.staffName || ''), rolePreview: i.role || 'agent_preview',
      taskDraftPreview: maskMessage(i.task || 'Follow up with pending customer.'),
       duePreview: i.due || 'today_preview',
     });

 }
 module.exports = { staffAutomationPreview };

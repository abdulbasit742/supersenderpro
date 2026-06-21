// lib/workflowOrchestrator/eventTimelinePreview.js — synthetic ordered timeline for a workflow draft.
 'use strict';
 const cfg = require('./config');
 const { normalizeDraft } = require('./workflowModel');
 const { redactEvent } = require('./redactor');


 function eventTimelinePreview(input) {
     const wf = normalizeDraft((input && input.workflow) || input || {});
     let t = 0; const timeline = [];
     timeline.push(redactEvent({ type: 'trigger:' + wf.trigger.type, at: t }));
     wf.conditions.forEach((c, i) => { t += 1; timeline.push(redactEvent({ type: 'condition:' + (c.type || c.field || i),
 at: t })); });
   wf.actions.forEach((a, i) => { t += 1; timeline.push(redactEvent({ type: 'action_preview:' + (a.type || a.action || i),
 at: t })); });

     return cfg.base({ eventTimelinePreview: timeline });
 }
 module.exports = { eventTimelinePreview };

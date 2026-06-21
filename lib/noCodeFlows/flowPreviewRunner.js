'use strict';


/**
 * No-Code Flows — dry-run preview runner. Walks the flow from its trigger and
    * produces a step list + message drafts. NEVER sends, calls APIs, or mutates data.
    */

const registry = require('./nodeRegistry');
const validator = require('./flowValidator');

function maskPhone(v) { if (!v) return null; const d = String(v).replace(/[^0-9]/g, ''); return d.length <= 4 ? '****' :
'****' + d.slice(-3); }


function describe(node, sample) {
     const cfg = node.config || {};
     switch (node.type) {
         case 'trigger_keyword': return 'Triggered by keyword "' + (cfg.keyword || '?') + '"';
         case 'trigger_new_message': return 'Triggered on new inbound message';
         case 'trigger_abandoned_cart': return 'Triggered on abandoned cart';
         case 'condition_tag': return 'Check if contact has tag "' + (cfg.tag || '?') + '"';
         case 'condition_order_status': return 'Check if order status is "' + (cfg.status || '?') + '"';
         case 'action_whatsapp_draft': return 'WOULD draft WhatsApp message (not sent)';
         case 'action_saved_reply': return 'WOULD use saved reply "' + (cfg.replyId || '?') + '" (not sent)';
         case 'action_add_tag': return 'WOULD add tag "' + (cfg.tag || '?') + '" (preview only)';
         case 'action_create_task': return 'WOULD create task "' + (cfg.title || '?') + '" (preview only)';
         case 'action_request_approval': return 'WOULD request admin approval (preview only)';
         case 'delay_wait': return 'Wait ' + (cfg.minutes || 0) + ' minute(s)';
         case 'end': return 'End of flow';
         default: return 'Unknown node';
     }
}

// Walk nodes following edges from the trigger; linear-first, branches noted.
function run(flow, sampleInput) {
     const f = flow || {};
     const v = validator.validate(f);
     const steps = [], messageDrafts = [], warnings = v.warnings.slice(), blockers = v.errors.slice();
     const sample = sampleInput || { contact: { phone: '+1 555 0100', tags: ['demo'] }, order: { status: 'pending' } };

     if (!v.valid) return base(f, steps, messageDrafts, warnings, blockers);


     const byId = {}; (f.nodes || []).forEach(function (n) { byId[n.id] = n; });
     const edgesFrom = function (nid) { return (f.edges || []).filter(function (e) { return e.from === nid; }); };

   let current = f.trigger;
   const visited = {};
   let guard = 0;
   steps.push({ nodeId: current.id, type: current.type, detail: describe(current, sample) });

   let nextEdges = edgesFrom(current.id);
   while (nextEdges.length && guard < 100) {
     guard++;
       const edge = nextEdges[0]; // linear preview; branches recorded as warnings
       if (nextEdges.length > 1) warnings.push('Node ' + current.id + ' has ' + nextEdges.length + ' branches; preview follows the first.');
   const node = byId[edge.to];
       if (!node) break;
       if (visited[node.id]) { warnings.push('Loop detected at node ' + node.id + '; preview stopped.'); break; }
       visited[node.id] = true;
       steps.push({ nodeId: node.id, type: node.type, detail: describe(node, sample) });
   if (node.type === 'action_whatsapp_draft') messageDrafts.push({ channel: 'whatsapp', to: maskPhone(sample.contact &&
sample.contact.phone), body: (node.config && node.config.message) || '(empty draft)', dryRun: true });
   if (node.type === 'action_saved_reply') messageDrafts.push({ channel: 'whatsapp', to: maskPhone(sample.contact &&
sample.contact.phone), savedReply: (node.config && node.config.replyId) || '?', dryRun: true });
       if (node.type === 'end') break;
       current = node;
       nextEdges = edgesFrom(node.id);
   }
   if (guard >= 100) warnings.push('Preview stopped after 100 steps (possible cycle).');

   return base(f, steps, messageDrafts, warnings, blockers);
}


function base(f, steps, messageDrafts, warnings, blockers) {
 return { ok: blockers.length === 0, dryRun: true, liveActionsEnabled: false, flowId: f.id || null, steps: steps,
messageDrafts: messageDrafts, warnings: warnings, blockers: blockers };
}

module.exports = { run };

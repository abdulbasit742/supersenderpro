 // lib/superflow/engine.js
 // SuperFlow Studio - dry-run simulator. Walks a flow from its trigger and reports
 // the execution path, skipped nodes, errors, and the actions that WOULD happen.
 // NEVER sends messages or calls external services in this phase.


 'use strict';


 const { validateFlow } = require('./validators');

 function maskPhone(v) {
   const s = String(v || '');
     return s.replace(/.(?=.{4})/g, '•');
 }


 function buildGraph(flow) {
     const map = {};
     for (const e of (flow.edges || [])) {
      if (!map[e.from]) map[e.from] = [];
      map[e.from].push({ to: e.to, on: e.on || null });
     }
     return map;
 }


 function nodeById(flow) {
   const m = {};
     for (const n of (flow.nodes || [])) m[n.id] = n;
     return m;
 }


 function evalCondition(node, ctx) {
   const c = ctx || {};
     switch (node.check) {
       case 'message_contains':
        return String(c.message || '').toLowerCase().includes(String(node.value || '').toLowerCase());
      case 'customer_has_tag':
        return Array.isArray(c.tags) && c.tags.includes(node.value);
      case 'order_amount_greater_than':
        return Number(c.amount || 0) > Number(node.value || 0);
      case 'payment_status_is':
        return String(c.paymentStatus || '') === String(node.value || '');
      case 'product_is':
        return String(c.product || '') === String(node.value || '');
      case 'channel_is':
        return String(c.channel || '') === String(node.value || '');
      case 'time_between': {
        const h = typeof c.hour === 'number' ? c.hour : new Date().getHours();
        const from = Number(node.from || 0), to = Number(node.to || 23);


         return from <= to ? (h >= from && h <= to) : (h >= from || h <= to);
        }
        default:
         return false;
    }
}


function describeAction(node, ctx) {
 const c = ctx || {};
    const to = maskPhone(c.from || c.customerNumber || 'customer');
    switch (node.action) {
        case 'send_whatsapp_message':
          return { action: 'send_whatsapp_message', to, message: node.message || '', wouldSend: true };
        case 'notify_admin':
          return { action: 'notify_admin', message: node.message || 'admin notification' };
        case 'add_customer_tag':
          return { action: 'add_customer_tag', tag: node.tag };
        case 'remove_customer_tag':
          return { action: 'remove_customer_tag', tag: node.tag };
        case 'create_followup_task':
          return { action: 'create_followup_task', title: node.title || 'Follow up' };
        case 'call_n8n_webhook':
          return { action: 'call_n8n_webhook', note: 'simulated; no real webhook called' };
        case 'append_google_sheet_row':
          return { action: 'append_google_sheet_row', sheet: node.sheet || 'default', note: 'simulated; no real sheet write'
};
        case 'update_order_status':
          return { action: 'update_order_status', status: node.status || 'unknown', note: 'simulated; order not modified' };
        default:
         return { action: node.action, note: 'unknown action' };
    }
}

function simulate(flow, sample) {
 const result = { ok: true, dryRun: true, path: [], skipped: [], wouldDo: [], errors: [], warnings: [] };


    const v = validateFlow(flow);
    result.warnings = v.warnings;
    if (!v.ok) { result.ok = false; result.errors = v.errors; return result; }


    const byId = nodeById(flow);
    const graph = buildGraph(flow);
    const trigger = (flow.nodes || []).find((n) => n.type === 'trigger');
    if (!trigger) { result.ok = false; result.errors.push('no trigger node'); return result; }


    const ctx = sample && typeof sample === 'object' ? sample : {};
    const visited = new Set();
    const MAX_STEPS = 200;
    let steps = 0;


    function walk(nodeId, branch) {
        if (steps++ > MAX_STEPS) { result.errors.push('max steps exceeded (possible cycle)'); return; }
        const node = byId[nodeId];
        if (!node) { result.errors.push(`missing node: ${nodeId}`); return; }
        if (visited.has(nodeId)) return;
        visited.add(nodeId);


         const step = { id: node.id, type: node.type, branch: branch || null };


         if (node.type === 'condition') {
             let pass = false;
             try { pass = evalCondition(node, ctx); }
             catch (e) { result.errors.push(`condition ${node.id} error: ${e.message}`); }
             step.result = pass ? 'true' : 'false';
             result.path.push(step);
             const outs = graph[nodeId] || [];
             for (const o of outs) {
               const want = o.on || 'true';
               if (want === (pass ? 'true' : 'false')) walk(o.to, want);
               else result.skipped.push({ id: o.to, reason: `condition ${node.id} was ${pass}` });
             }
             return;
         }


         if (node.type === 'action') {
           try { result.wouldDo.push(describeAction(node, ctx)); }
             catch (e) { result.errors.push(`action ${node.id} error: ${e.message}`); }
             step.action = node.action;
         } else if (node.type === 'wait') {
           step.waitSeconds = Number(node.seconds || 0);
         }
         result.path.push(step);


         for (const o of (graph[nodeId] || [])) walk(o.to, o.on);
     }


     walk(trigger.id, 'trigger');
     result.ok = result.errors.length === 0;
     return result;
 }


 module.exports = { simulate, evalCondition, describeAction, maskPhone };

 // lib/superflow/validators.js
 // SuperFlow Studio - flow + node schema validation. Pure functions, no I/O.


 'use strict';


 const NODE_TYPES = ['trigger', 'condition', 'action', 'wait', 'note'];


 const TRIGGER_TYPES = [
   'inbound_message', 'new_order', 'payment_confirmed', 'abandoned_cart',
      'subscription_expiring', 'customer_created', 'tag_added',
 ];


const CONDITION_TYPES = [
 'message_contains', 'customer_has_tag', 'order_amount_greater_than',
    'payment_status_is', 'time_between', 'product_is', 'channel_is',
];


const ACTION_TYPES = [
    'send_whatsapp_message', 'notify_admin', 'add_customer_tag', 'remove_customer_tag',
    'create_followup_task', 'call_n8n_webhook', 'append_google_sheet_row', 'update_order_status',
];


function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }


function validateNode(node, i) {
 const errs = [];
    if (!isObj(node)) return [`node[${i}] is not an object`];
    if (!node.id) errs.push(`node[${i}] missing id`);
    if (!NODE_TYPES.includes(node.type)) errs.push(`node[${i}] invalid type: ${node.type}`);
    if (node.type === 'trigger' && node.event && !TRIGGER_TYPES.includes(node.event)) errs.push(`node[${i}] invalid trigger
event: ${node.event}`);
 if (node.type === 'condition' && node.check && !CONDITION_TYPES.includes(node.check)) errs.push(`node[${i}] invalid
condition check: ${node.check}`);
 if (node.type === 'action' && node.action && !ACTION_TYPES.includes(node.action)) errs.push(`node[${i}] invalid action:
${node.action}`);
 if (node.type === 'wait' && !(Number(node.seconds) >= 0)) errs.push(`node[${i}] wait needs seconds >= 0`);
    return errs;
}


function validateFlow(flow) {
    const errors = [];
    const warnings = [];
    if (!isObj(flow)) return { ok: false, errors: ['flow is not an object'], warnings };
    if (!flow.name || !String(flow.name).trim()) errors.push('flow.name required');


    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    if (!nodes.length) errors.push('flow has no nodes');


    const triggers = nodes.filter((n) => n && n.type === 'trigger');
    if (!triggers.length) errors.push('flow needs at least one trigger node');
    if (triggers.length > 1) warnings.push('flow has multiple triggers; simulator starts from the first');


    const ids = new Set();
    nodes.forEach((n, i) => {
      validateNode(n, i).forEach((e) => errors.push(e));
      if (n && n.id) {
          if (ids.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
          ids.add(n.id);
      }
    });

    const edges = Array.isArray(flow.edges) ? flow.edges : [];
    edges.forEach((e, i) => {
      if (!isObj(e)) { errors.push(`edge[${i}] not an object`); return; }
      if (!ids.has(e.from)) errors.push(`edge[${i}] from references unknown node: ${e.from}`);
      if (!ids.has(e.to)) errors.push(`edge[${i}] to references unknown node: ${e.to}`);
    });


     return { ok: errors.length === 0, errors, warnings };
 }


 module.exports = { NODE_TYPES, TRIGGER_TYPES, CONDITION_TYPES, ACTION_TYPES, validateNode, validateFlow };

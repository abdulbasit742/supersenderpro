'use strict';

/**
* No-Code Flows — node registry. Defines trigger/condition/action/control nodes,
* their category, required config, and whether they are dry-run safe (all are).
*/


const NODES = [
 { type: 'trigger_keyword', category: 'trigger', label: 'Keyword trigger', requires: ['keyword'] },
    { type: 'trigger_new_message', category: 'trigger', label: 'New message trigger', requires: [] },
    { type: 'trigger_abandoned_cart', category: 'trigger', label: 'Abandoned cart trigger', requires: [] },
    { type: 'condition_tag', category: 'condition', label: 'Has tag?', requires: ['tag'] },
    { type: 'condition_order_status', category: 'condition', label: 'Order status is?', requires: ['status'] },
 { type: 'action_whatsapp_draft', category: 'action', label: 'WhatsApp message draft', requires: ['message'], draftOnly:
true },
    { type: 'action_saved_reply', category: 'action', label: 'Saved reply', requires: ['replyId'], draftOnly: true },
    { type: 'action_add_tag', category: 'action', label: 'Add tag (preview)', requires: ['tag'], previewOnly: true },
 { type: 'action_create_task', category: 'action', label: 'Create task (preview)', requires: ['title'], previewOnly:
true },
    { type: 'action_request_approval', category: 'action', label: 'Request approval', requires: [], previewOnly: true },
    { type: 'delay_wait', category: 'control', label: 'Wait/delay', requires: ['minutes'] },
    { type: 'end', category: 'control', label: 'End', requires: [] },
];

const BY_TYPE = NODES.reduce(function (m, n) { m[n.type] = n; return m; }, {});


function list() { return NODES.slice(); }
function isValidType(t) { return !!BY_TYPE[t]; }
function get(t) { return BY_TYPE[t] || null; }
function label(t) { return BY_TYPE[t] ? BY_TYPE[t].label : t; }
function triggers() { return NODES.filter(function (n) { return n.category === 'trigger'; }); }
function actions() { return NODES.filter(function (n) { return n.category === 'action'; }); }


module.exports = { NODES, list, isValidType, get, label, triggers, actions };

// lib/supportInbox/cannedReplies.js — Reusable reply snippets with {{merge}} fields.
// Seeds a few defaults on first use. Rendering substitutes ticket/contact context.

const store = require('./store');

const DEFAULTS = [
 { id: 'greeting', title: 'Greeting', body: 'Hi {{name}}, thanks for reaching out to SuperSender support. We are looking into this and will update you shortly.' },
 { id: 'ack_billing', title: 'Billing acknowledgement', body: 'Hi {{name}}, we have received your billing query on ticket {{ticket}}. Our team is reviewing it now.' },
 { id: 'resolved', title: 'Resolved', body: 'Hi {{name}}, your ticket {{ticket}} has been resolved. Reply here anytime if you need more help.' },
 { id: 'need_info', title: 'Need more info', body: 'Hi {{name}}, to help with ticket {{ticket}} could you share a bit more detail (screenshots / steps)?' },
];

function _seed() {
 const d = store.load();
 if (!d.cannedReplies.length) { d.cannedReplies = DEFAULTS.slice(); store.save(d); }
 return d.cannedReplies;
}
function list() { return _seed(); }
function get(id) { return list().find((r) => r.id === id) || null; }
function upsert(reply) {
 const d = store.load(); _seed();
 const fresh = store.load();
 const idx = fresh.cannedReplies.findIndex((r) => r.id === reply.id);
 const rec = { id: reply.id || store.genId('cr'), title: reply.title || 'Untitled', body: reply.body || '' };
 if (idx >= 0) fresh.cannedReplies[idx] = rec; else fresh.cannedReplies.push(rec);
 store.save(fresh);
 return rec;
}
function render(id, ctx = {}) {
 const r = get(id);
 if (!r) return null;
 const map = { name: ctx.name || 'there', ticket: ctx.ticket || '', agent: ctx.agent || 'Support' };
 return r.body.replace(/\{\{(\w+)\}\}/g, (_m, k) => (map[k] !== undefined ? map[k] : ''));
}

module.exports = { list, get, upsert, render, DEFAULTS };

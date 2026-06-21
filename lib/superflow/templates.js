 // lib/superflow/templates.js
 // SuperFlow Studio - built-in flow templates. Pure data + a factory. No I/O.


 'use strict';


 function node(id, type, extra) { return Object.assign({ id, type }, extra || {}); }
 function edge(from, to, on) { return on ? { from, to, on } : { from, to }; }

 const TEMPLATES = {
   abandoned_cart: {
         id: 'abandoned_cart', name: 'Abandoned Cart Recovery',
         description: 'Nudge a customer who started an order but did not pay.',
         build() {
           return {
               nodes: [
                 node('t1', 'trigger', { event: 'abandoned_cart' }),


            node('w1', 'wait', { seconds: 1200 }),
            node('c1', 'condition', { check: 'payment_status_is', value: 'pending' }),
            node('a1', 'action', { action: 'send_whatsapp_message', message: 'Aap ka order abhi pending hai. "PAID" reply\nkarein.' }),
         node('a2', 'action', { action: 'create_followup_task', title: 'Follow up abandoned cart' }),
          ],
          edges: [edge('t1', 'w1'), edge('w1', 'c1'), edge('c1', 'a1', 'true'), edge('a1', 'a2')],
       };
     },
 },
 payment_reminder: {
     id: 'payment_reminder', name: 'Payment Reminder',
     description: 'Remind a customer to complete payment.',
     build() {
       return {
          nodes: [
            node('t1', 'trigger', { event: 'new_order' }),
            node('w1', 'wait', { seconds: 3600 }),
            node('c1', 'condition', { check: 'payment_status_is', value: 'unpaid' }),
         node('a1', 'action', { action: 'send_whatsapp_message', message: 'Payment ka intezaar hai. Order confirm karne\nke liye payment bhejein.' }),
          ],
          edges: [edge('t1', 'w1'), edge('w1', 'c1'), edge('c1', 'a1', 'true')],
       };
     },
 },
 renewal_reminder: {
     id: 'renewal_reminder', name: 'Renewal Reminder',
     description: 'Remind before a subscription expires.',
     build() {
       return {
          nodes: [
            node('t1', 'trigger', { event: 'subscription_expiring' }),
         node('a1', 'action', { action: 'send_whatsapp_message', message: 'Aap ki subscription expire hone wali hai.\n"RENEW" reply karein.' }),
          ],
          edges: [edge('t1', 'a1')],
       };
     },
 },
 new_lead_welcome: {
     id: 'new_lead_welcome', name: 'New Lead Welcome',
     description: 'Welcome a newly created customer/lead.',
     build() {
       return {
          nodes: [
            node('t1', 'trigger', { event: 'customer_created' }),
            node('a1', 'action', { action: 'add_customer_tag', tag: 'new_lead' }),
            node('a2', 'action', { action: 'send_whatsapp_message', message: 'Welcome! Aap kaise tool ki talash mein hain?'
}),
          ],
          edges: [edge('t1', 'a1'), edge('a1', 'a2')],
       };
     },
 },
 support_handoff: {
   id: 'support_handoff', name: 'Support Handoff',


      description: 'Route a complaint/keyword to a human.',
      build() {
        return {
           nodes: [
             node('t1', 'trigger', { event: 'inbound_message' }),
              node('c1', 'condition', { check: 'message_contains', value: 'agent' }),
              node('a1', 'action', { action: 'notify_admin', message: 'Customer requested a human agent.' }),
              node('a2', 'action', { action: 'add_customer_tag', tag: 'needs_human' }),
           ],
           edges: [edge('t1', 'c1'), edge('c1', 'a1', 'true'), edge('a1', 'a2')],
         };
      },
    },
    order_confirmation: {
      id: 'order_confirmation', name: 'Order Confirmation',
      description: 'Confirm an order once payment is verified.',
      build() {
         return {
           nodes: [
              node('t1', 'trigger', { event: 'payment_confirmed' }),
              node('a1', 'action', { action: 'update_order_status', status: 'confirmed' }),
              node('a2', 'action', { action: 'send_whatsapp_message', message: 'Payment mil gayi! Aap ka order confirm ho\ngaya.' }),
              node('a3', 'action', { action: 'append_google_sheet_row', sheet: 'orders' }),
           ],
           edges: [edge('t1', 'a1'), edge('a1', 'a2'), edge('a2', 'a3')],
         };
      },
    },
    winback_offer: {
      id: 'winback_offer', name: 'Win-back Offer',
      description: 'Offer a discount to a lapsed customer.',
      build() {
         return {
           nodes: [
              node('t1', 'trigger', { event: 'tag_added', tag: 'lapsed' }),
              node('c1', 'condition', { check: 'customer_has_tag', value: 'lapsed' }),
         node('a1', 'action', { action: 'send_whatsapp_message', message: 'Wapas aa jayein, 15% off sirf aap ke liye.\n"RENEW" reply karein.' }),
           ],
           edges: [edge('t1', 'c1'), edge('c1', 'a1', 'true')],
         };
      },
    },
};


function listTemplates() {
    return Object.values(TEMPLATES).map((t) => ({ id: t.id, name: t.name, description: t.description }));
}


function buildTemplate(id) {
    const t = TEMPLATES[String(id)];
    if (!t) return null;
    const built = t.build();
    return { name: t.name, nodes: built.nodes, edges: built.edges, meta: { template: t.id } };
}


module.exports = { listTemplates, buildTemplate, TEMPLATES };

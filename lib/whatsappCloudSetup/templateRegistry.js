 'use strict';

 /**
     * Local WhatsApp Cloud template registry (no network, no Meta calls).
     *
     * status values:
     *   'unknown'                     - not yet assessed
     *        'local-only'             - defined locally, not submitted to Meta
     *        'needs-meta-approval'    - intended for Meta but not approved
     *        'approved-placeholder'   - placeholder ONLY; never implies real Meta approval
     *
     * IMPORTANT: This registry never claims a template is approved by Meta.
     * Real approval state must come from existing config / Meta, not from here.
     */

 const DEFAULT_LANGUAGE = (process.env.WHATSAPP_CLOUD_TEMPLATE_LANGUAGE || 'en_US').trim();


 function t(name, category, placeholders, sampleParams, notes) {
   return {
           name: name,
           category: category,
           language: DEFAULT_LANGUAGE,
           placeholders: placeholders,
           sampleParams: sampleParams,
           status: 'local-only',
           notes: notes,
         };
 }

 const TEMPLATES = [
   t('order_confirmation', 'UTILITY', ['customer_name', 'order_id', 'order_total'],
           ['Ahsan', 'ORD-10231', 'PKR 4,500'],
           'Sent after an order is placed. Map params in component body order.'),
         t('payment_pending', 'UTILITY', ['customer_name', 'order_id', 'amount_due'],
           ['Ahsan', 'ORD-10231', 'PKR 4,500'],
           'Reminds customer a payment is pending. Do not include payment links unless approved.'),
         t('payment_received', 'UTILITY', ['customer_name', 'order_id', 'amount_paid'],
           ['Ahsan', 'ORD-10231', 'PKR 4,500'],
           'Confirmation only. Does not trigger any order state change in this wizard.'),
         t('delivery_update', 'UTILITY', ['customer_name', 'order_id', 'status_text'],
           ['Ahsan', 'ORD-10231', 'Out for delivery'],
           'Shipment / fulfillment status update.'),
         t('renewal_reminder', 'UTILITY', ['customer_name', 'plan_name', 'renewal_date'],
           ['Ahsan', 'Pro Monthly', '2026-07-01'],
           'Subscription renewal reminder.'),
         t('abandoned_cart', 'MARKETING', ['customer_name', 'item_name'],
           ['Ahsan', 'Wireless Earbuds'],

     'MARKETING category requires opt-in. Review Meta marketing policy before use.'),
   t('support_handoff', 'UTILITY', ['customer_name', 'ticket_id'],
     ['Ahsan', 'TKT-552'],
     'Notifies customer that a human agent will follow up.'),
   t('admin_alert', 'UTILITY', ['alert_title', 'alert_detail'],
     ['Low stock', 'SKU-99 below threshold'],
     'Internal operational alert to an admin number.'),
   t('stock_unavailable', 'UTILITY', ['customer_name', 'item_name'],
     ['Ahsan', 'Wireless Earbuds'],
     'Informs customer an item is out of stock.'),
   t('welcome_message', 'UTILITY', ['customer_name'],
     ['Ahsan'],
     'First-contact welcome. Keep within session/template policy.'),
];


function listTemplates() {
return TEMPLATES.map(function (x) { return Object.assign({}, x); });
}


function getTemplate(name) {
if (!name) return null;
   const found = TEMPLATES.find(function (x) { return x.name === String(name).trim(); });
   return found ? Object.assign({}, found) : null;
}

function templateNames() {
return TEMPLATES.map(function (x) { return x.name; });
}


function summary() {
const byStatus = {};
   TEMPLATES.forEach(function (x) { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });
   return {
     total: TEMPLATES.length,
     language: DEFAULT_LANGUAGE,
     byStatus: byStatus,
     note: 'Statuses are local. None imply Meta approval unless your existing config says so.',
   };
}


module.exports = {
   DEFAULT_LANGUAGE,
   listTemplates,
   getTemplate,
   templateNames,
   summary,
};

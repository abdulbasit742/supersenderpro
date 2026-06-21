'use strict';
/**
* journeyModel.js — journey + step shapes, enums, validation, default journeys.
  * Pure data + helpers; no I/O.
  */
const crypto = require('crypto');

const STATUSES = ['draft', 'preview_ready', 'paused', 'archived'];
const CHANNELS = ['email', 'sms', 'whatsapp_preview'];
const STEP_TYPES = [
'send_email_draft', 'send_sms_draft', 'whatsapp_draft', 'wait',
   'condition_segment', 'condition_order_status', 'condition_no_reply',
   'add_tag_preview', 'create_task_preview', 'end',
];


function step(type, opts) {
return Object.assign({ id: 'st_' + crypto.randomBytes(4).toString('hex'), type }, opts || {});
}


function newJourney(input) {
const now = new Date().toISOString();
   const i = input || {};
   return {
     id: i.id || 'jr_' + crypto.randomBytes(5).toString('hex'),
     name: i.name || 'Untitled journey',
     description: i.description || '',
     status: STATUSES.includes(i.status) ? i.status : 'draft',
     audienceSegment: i.audienceSegment || 'all_customers',
     channelMix: Array.isArray(i.channelMix) ? i.channelMix.filter((c) => CHANNELS.includes(c)) : ['email'],
     steps: Array.isArray(i.steps) ? i.steps : [],
     consentRequired: i.consentRequired !== false,
     dryRun: true,
     createdAt: i.createdAt || now,
     updatedAt: now,
   };
}


function validate(j) {
const errors = [];
   if (!j.name) errors.push('name_required');
   if (!STATUSES.includes(j.status)) errors.push('bad_status');
   (j.steps || []).forEach((s, idx) => { if (!STEP_TYPES.includes(s.type)) errors.push('bad_step_type@' + idx); });
   if (j.dryRun !== true) errors.push('dry_run_must_be_true');
   return { ok: errors.length === 0, errors };
}

// Eight default journeys, each preview-ready, consent-required, dry-run.
function defaults() {
const mk = (id, name, description, channelMix, steps) => newJourney({ id, name, description, status: 'preview_ready',
channelMix, steps });
return [
     mk('welcome_series', 'Welcome Series', 'Onboard new customers across 3 touches.', ['email', 'sms'], [
       step('send_email_draft', { templateId: 'welcome_email', delay: '0m' }),
        step('wait', { duration: '2d' }),
        step('send_sms_draft', { templateId: 'welcome_sms' }),
        step('end', {}),

       ]),
       mk('abandoned_cart', 'Abandoned Cart', 'Recover carts left without checkout.', ['email', 'sms'], [
         step('condition_order_status', { status: 'cart_abandoned' }),
          step('send_email_draft', { templateId: 'cart_email', delay: '1h' }),
          step('wait', { duration: '1d' }),
          step('condition_no_reply', {}),
          step('send_sms_draft', { templateId: 'cart_sms' }),
         step('end', {}),
       ]),
       mk('payment_reminder', 'Payment Reminder', 'Nudge pending payments politely.', ['email', 'whatsapp_preview'], [
         step('condition_order_status', { status: 'payment_pending' }),
          step('send_email_draft', { templateId: 'payment_email' }),
          step('wait', { duration: '2d' }),
          step('whatsapp_draft', { templateId: 'payment_wa' }),
          step('end', {}),
       ]),
       mk('order_followup', 'Order Follow-up', 'Thank + check satisfaction post-delivery.', ['email'], [
          step('condition_order_status', { status: 'delivered' }),
          step('send_email_draft', { templateId: 'followup_email', delay: '1d' }),
          step('add_tag_preview', { tag: 'post_purchase' }),
          step('end', {}),
       ]),
       mk('winback', 'Winback', 'Re-engage lapsed customers.', ['email', 'sms'], [
          step('condition_segment', { segment: 'lapsed_90d' }),
          step('send_email_draft', { templateId: 'winback_email' }),
          step('wait', { duration: '3d' }),
          step('condition_no_reply', {}),
          step('send_sms_draft', { templateId: 'winback_sms' }),
          step('end', {}),
       ]),
       mk('review_request', 'Review Request', 'Ask happy customers for a review.', ['email'], [
          step('condition_order_status', { status: 'delivered' }),
          step('wait', { duration: '5d' }),
          step('send_email_draft', { templateId: 'review_email' }),
          step('end', {}),
       ]),
       mk('support_followup', 'Support Follow-up', 'Confirm a resolved ticket.', ['email', 'sms'], [
          step('send_email_draft', { templateId: 'support_email' }),
          step('send_sms_draft', { templateId: 'support_sms' }),
         step('end', {}),
       ]),
       mk('lead_nurture', 'Lead Nurture', 'Warm up new leads from the website widget.', ['email'], [
         step('condition_segment', { segment: 'new_leads' }),
          step('send_email_draft', { templateId: 'nurture_email_1' }),
          step('wait', { duration: '3d' }),
          step('send_email_draft', { templateId: 'nurture_email_2' }),
          step('end', {}),
       ]),
     ];
 }


 module.exports = { STATUSES, CHANNELS, STEP_TYPES, step, newJourney, validate, defaults };
